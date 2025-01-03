import {Model} from 'sequelize'

export default (sequelize, DataTypes) => {
  class SharedKey extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SharedKey.belongsTo(models.User, {foreignKey: 'userId', onDelete: 'CASCADE'})
      SharedKey.belongsTo(models.User, {foreignKey: 'ownableId', as: 'Collaborator', constraints: false})
    }
  }
  SharedKey.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    key: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    userId: {
      allowNull: false,
      type: DataTypes.UUID
    },
    ownableId: {
      allowNull: false,
      type: DataTypes.UUID
    }
  }, {
    hooks: {
      afterFind(result) {
        if (result) {
          const keys = Array.isArray(result) ? result : [result]

          for (const key of keys) {
            if (key.Collaborator !== undefined)
              key.ownable = key.Collaborator

            // To prevent mistakes:
            delete key.Collaborator
            delete key.dataValues.Collaborator
          }
        }
      }
    },
    sequelize,
    modelName: 'SharedKey',
  })
  return SharedKey
}
