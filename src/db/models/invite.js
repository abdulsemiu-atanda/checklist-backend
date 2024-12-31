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
      Invite.hasOne(
        models.Token,
        {foreignKey: 'tokenableId', as: 'Lead', constraints: false, scope: {tokenableType: 'Invite'}}
      )
    }
  }
  Invite.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
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
    sequelize,
    modelName: 'Invite',
  })
  return Invite
}
