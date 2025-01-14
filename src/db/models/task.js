import {Model} from "sequelize"
import {COMPLETED, CREATED, STARTED} from "../../config/tasks"

export default (sequelize, DataTypes) => {
  class Task extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Task.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      })
      Task.hasMany(models.Permission, {foreignKey: 'taskId'})
    }
  }
  Task.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    title: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    description: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    status: {
      allowNull: false,
      type: DataTypes.ENUM(CREATED, STARTED, COMPLETED),
      defaultValue: CREATED
    },
    userId: {
      allowNull: false,
      type: DataTypes.UUID,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    hooks: {
      afterFind(result) {
        if (result) {
          const tasks = Array.isArray(result) ? result : [result]

          for (const task of tasks) {
            if (task.Permissions) {
              for (const permission of task.Permissions) {
                if (permission.ownableType === 'User' && permission.User !== undefined)
                  permission.dataValues.ownable = permission.User
                else if (permission.ownableType === 'Invite' && permission.Invite !== undefined)
                  permission.dataValues.ownable = permission.Invite
    
                // To prevent mistakes:
                delete permission.User
                delete permission.dataValues.User
                delete permission.Invite
                delete permission.dataValues.Invite
              }
            }
          }
        }
      }
    },
    sequelize,
    modelName: 'Task',
  })
  return Task
}
