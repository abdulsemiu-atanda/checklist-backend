import {Model} from 'sequelize'

export default (sequelize, DataTypes) => {
  class UserKey extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserKey.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'CASCADE'
      })
    }
  }
  UserKey.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    backupKey: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    privateKey: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    publicKey: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    fingerprint: {
      allowNull: false,
      type: DataTypes.STRING
    },
    userId: {
      allowNull: false,
      type: DataTypes.UUID
    }
  }, {
    sequelize,
    modelName: 'UserKey',
  })
  return UserKey
}
