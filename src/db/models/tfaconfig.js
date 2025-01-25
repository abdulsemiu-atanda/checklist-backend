import {Model} from 'sequelize'

import {ACTIVE, DISABLED, INITIAL} from '../../config/tfaStatuses'

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
    status: {
      allowNull: false,
      type: DataTypes.ENUM(ACTIVE, DISABLED, INITIAL),
      defaultValue: INITIAL
    },
    url: DataTypes.STRING,
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
