import {Model} from 'sequelize'

import SymmetricEncryptionService from '../../app/services/SymmetricEncryptionService'
import {digest} from '../../util/cryptTools'

import {ACCEPTED, DECLINED, DRAFT, PENDING} from '../../config/invites'

const encryptor = new SymmetricEncryptionService(process.env.DATA_ENCRYPTION_KEY)

export default (sequelize, DataTypes) => {
  class Invite extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Invite.belongsTo(models.Token, {foreignKey: 'tokenId', onDelete: 'CASCADE'})
      Invite.hasMany(
        models.Permission,
        {foreignKey: 'ownableId', constraints: false, scope: {ownableType: 'Invite'}}
      )
    }
  }
  Invite.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    firstName: {
      allowNull: false,
      type: DataTypes.STRING,
      get() {
        return encryptor.decrypt(this.getDataValue('firstName'))
      },
      set(value) {
        this.setDataValue('firstName', encryptor.encrypt(value))
      }
    },
    lastName: {
      allowNull: false,
      type: DataTypes.STRING,
      get() {
        return encryptor.decrypt(this.getDataValue('lastName'))
      },
      set(value) {
        this.setDataValue('lastName', encryptor.encrypt(value))
      }
    },
    email: {
      allowNull: false,
      type: DataTypes.STRING,
      get() {
        return encryptor.decrypt(this.getDataValue('email'))
      },
      set(value) {
        this.setDataValue('email', encryptor.encrypt(value.toLowerCase()))
        this.setDataValue('emailDigest', digest(value.toLowerCase()))
      }
    },
    emailDigest: {
      allowNull: false,
      type: DataTypes.STRING
    },
    status: {
      allowNull: false,
      type: DataTypes.ENUM(ACCEPTED, DECLINED, DRAFT, PENDING),
      defaultValue: DRAFT
    },
    sentAt: DataTypes.DATE,
    acceptedAt: DataTypes.DATE,
    tokenId: {
      allowNull: false,
      type: DataTypes.UUID
    }
  }, {
    hooks: {
      afterCreate(invite) {
        // remove these attributes so they're not returned to user
        delete invite.dataValues.emailDigest
        delete invite.dataValues.tokenId
      }
    },
    sequelize,
    modelName: 'Invite',
  })
  return Invite
}
