import bcrypt from 'bcrypt'
import {Model} from 'sequelize'

import SymmetricEncryptionService from '../../app/services/SymmetricEncryptionService'
import confirmUserEmail from '../../app/mailers/confirmUserEmail'
import {digest} from '../../util/cryptTools'
import {generateCode} from '../../util/authTools'
import {smtpServer} from '../../util/tools'

const encryption = new SymmetricEncryptionService(process.env.DATA_ENCRYPTION_KEY)
const smtp = smtpServer()

export default (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.belongsTo(models.Role, {
        foreignKey: 'roleId',
        onDelete: 'CASCADE'
      })
      User.hasOne(models.Confirmation, {foreignKey: 'userId'})
      User.hasMany(models.Token, {foreignKey: 'userId'})
      User.hasMany(
        models.Token,
        {foreignKey: 'tokenableId', as: 'Collaborator', constraints: false, scope: {tokenableType: 'User'}}
      )
      User.hasOne(models.UserKey, {foreignKey: 'userId'})
    }
  }
  User.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    firstName: {
      allowNull: false,
      type: DataTypes.STRING,
      get() { return encryption.decrypt(this.getDataValue('firstName')) },
      set(value) {
        this.setDataValue('firstName', encryption.encrypt(value))
      }
    },
    lastName: {
      allowNull: false,
      type: DataTypes.STRING,
      get() { return encryption.decrypt(this.getDataValue('lastName')) },
      set(value) {
        this.setDataValue('lastName', encryption.encrypt(value))
      }
    },
    email: {
      allowNull: false,
      type: DataTypes.STRING,
      get() { return encryption.decrypt(this.getDataValue('email')) },
      set(value) {
        this.setDataValue('email', encryption.encrypt(value.toLowerCase()))
        this.setDataValue('emailDigest', digest(value.toLowerCase()))
      }
    },
    emailDigest: {
      allowNull: false,
      type: DataTypes.STRING,
      unique: true
    },
    password: {
      allowNull: false,
      type: DataTypes.TEXT,
      set(value) {
        this.setDataValue('password', bcrypt.hashSync(value, bcrypt.genSaltSync(10)))
      }
    },
    roleId: {
      allowNull: false,
      type: DataTypes.UUID,
    },
    confirmedAt: DataTypes.DATE,
    confirmed: {
      type: DataTypes.VIRTUAL,
      get() {
        return !!this.getDataValue('confirmedAt')
      },
      set() {
        throw new Error('Do not try to set the `confirmed` value!')
      }
    }
  }, {
    hooks: {
      afterCreate(user) {
        const code = generateCode()

        user.createConfirmation({code})
        smtp.delay(3000).send(confirmUserEmail(user.toJSON(), code))
      }
    },
    sequelize,
    modelName: 'User',
  })

  return User
}
