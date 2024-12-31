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
      Token.belongsTo(models.Invite, {foreignKey: 'tokenableId', as: 'Lead', constraints: false})
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
            else if (token.tokenableType === 'Invite' && token.Lead !== undefined)
              token.tokenable = token.Lead

            // To prevent mistakes:
            delete token.Collaborator
            delete token.dataValues.Collaborator
            delete token.Lead
            delete token.dataValues.Lead
          }
        }
      },
      async afterCreate(token) {
        if (token.Invite)
          await token.update({tokenableId: token.Invite.id, tokenableType: 'Invite'})
      }
    },
    sequelize,
    modelName: 'Token',
  })
  return Token
}
