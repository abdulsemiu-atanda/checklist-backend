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

      Token.belongsTo(models.User, {foreignKey: 'tokenableId', as: 'Collaborator', constraints: false})
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
    },
    tokenableId: DataTypes.UUID,
    tokenableType: DataTypes.STRING
  }, {
    hooks: {
      afterFind(result) {
        if (result) {
          const tokens = Array.isArray(result) ? result : [result]

          for (const token of tokens) {
            if (token.tokenableType === 'User' && token.Collaborator !== undefined)
              token.tokenable = token.Collaborator

            // To prevent mistakes:
            delete token.Collaborator
            delete token.dataValues.Collaborator
          }
        }
      }
    },
    sequelize,
    modelName: 'Token',
  })
  return Token
}
