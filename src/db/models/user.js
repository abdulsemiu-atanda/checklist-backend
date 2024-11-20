import bcrypt from 'bcrypt'
import {Model} from 'sequelize'

import SymmetricEncryptionService from '../../app/services/SymmetricEncryptionService'
import {digest} from '../../util/cryptTools'

const encryption = new SymmetricEncryptionService(process.env.DATA_ENCRYPTION_KEY)

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
          foreignKey: {
            allowNull: false,
          },
          onDelete: 'CASCADE'
        })
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
    RoleId: {
      allowNull: false,
      type: DataTypes.UUID,
    }
  }, {
    sequelize,
    modelName: 'User',
  })

  return User
}
