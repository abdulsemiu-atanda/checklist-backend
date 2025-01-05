import {Model} from 'sequelize'

import {PASSWORD, SHARING} from '../../config/tokens'

export default (sequelize, DataTypes) => {
  class Token extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Token.belongsTo(
        models.User,
        {
          foreignKey: 'userId',
          onDelete: 'CASCADE'
        }
      )
      Token.hasOne(models.Invite, {foreignKey: 'tokenId'})
    }
  }
  Token.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    value: {
      allowNull: false,
      type: DataTypes.STRING
    },
    userId: {
      allowNull: false,
      type: DataTypes.UUID,
    },
    type: {
      allowNull: false,
      type: DataTypes.ENUM(PASSWORD, SHARING),
      defaultValue: PASSWORD
    }
  }, {
    sequelize,
    modelName: 'Token',
  })
  return Token
}
