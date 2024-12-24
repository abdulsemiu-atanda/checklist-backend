import {Model} from 'sequelize'

import SymmetricEncryptionService from '../../app/services/SymmetricEncryptionService'
import {digest} from '../../util/cryptTools'

const encryption = new SymmetricEncryptionService(process.env.DATA_ENCRYPTION_KEY)

export default (sequelize, DataTypes) => {
  class Confirmation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Confirmation.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      })
    }
  }
  Confirmation.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    code: {
      allowNull: false,
      type: DataTypes.STRING,
      get() { return encryption.decrypt(this.getDataValue('code')) },
      set(value) {
        this.setDataValue('code', encryption.encrypt(value))
        this.setDataValue('codeDigest', digest(value))
      }
    },
    codeDigest: {
      allowNull: false,
      type: DataTypes.STRING
    },
    userId: {
      allowNull: false,
      type: DataTypes.UUID
    }
  }, {
    sequelize,
    modelName: 'Confirmation'
  })
  return Confirmation
}
