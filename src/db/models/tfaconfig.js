import {Model} from 'sequelize'

import SymmetricEncryptionService from '../../app/services/SymmetricEncryptionService'
import {secureHash} from '../../util/cryptTools'

import {ACTIVE, DISABLED, INITIAL} from '../../config/tfaStatuses'

const encryptor = new SymmetricEncryptionService(process.env.DATA_ENCRYPTION_KEY)

export default (sequelize, DataTypes) => {
  class TfaConfig extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TfaConfig.belongsTo(models.User, {foreignKey: 'userId', onDelete: 'CASCADE'})
    }
  }
  TfaConfig.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    backupCode: {
      type: DataTypes.STRING,
      set(value) {
        if (value)
          this.setDataValue('backupCode', secureHash(value, 'base64url'))
        else if (value !== undefined)
          this.setDataValue('url', value)
      }
    },
    status: {
      allowNull: false,
      type: DataTypes.ENUM(ACTIVE, DISABLED, INITIAL),
      defaultValue: INITIAL
    },
    url: {
      type: DataTypes.STRING,
      get() {
        const value = this.getDataValue('url')

        if (value)
          return encryptor.decrypt(value)

        return value
      },
      set(value) {
        if (value)
          this.setDataValue('url', encryptor.encrypt(value))
        else if (value !== undefined)
          this.setDataValue('url', value)
      }
    },
    userId: {
      allowNull: false,
      type: DataTypes.UUID
    }
  }, {
    sequelize,
    modelName: 'TfaConfig',
  })
  return TfaConfig
}
