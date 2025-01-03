import {Model} from 'sequelize'

import {EDIT, READ} from '../../config/permissions'

export default (sequelize, DataTypes) => {
  class Permission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Permission.belongsTo(models.Task, {foreignKey: 'taskId', onDelete: 'CASCADE'})
      Permission.belongsTo(models.User, {foreignKey: 'ownableId', constraints: false})
      Permission.belongsTo(models.Invite, {foreignKey: 'ownableId', constraints: false})
    }
  }
  Permission.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    type: {
      allowNull: false,
      type: DataTypes.ENUM(EDIT, READ),
      defaultValue: READ
    },
    taskId: {
      allowNull: false,
      type: DataTypes.UUID
    },
    ownableId: {
      allowNull: false,
      type: DataTypes.UUID
    },
    ownableType: {
      allowNull: false,
      type: DataTypes.STRING
    }
  }, {
    hooks: {
      afterFind(result) {
        if (result) {
          const permissions = Array.isArray(result) ? result : [result]

          for (const permission in permissions) {
            if (permission.ownableType === 'User' && permission.User !== undefined)
              permission.ownable = permission.User
            else if (permission.ownableType === 'Invite' && permission.Invite !== undefined)
              permission.ownable = permission.Invite

            // To prevent mistakes:
            delete permission.User
            delete permission.dataValues.User
            delete permission.Invite
            delete permission.dataValues.Invite
          }
        }
      }
    },
    sequelize,
    modelName: 'Permission',
  })
  return Permission
}
