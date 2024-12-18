import {Model} from 'sequelize'

import {ADMIN, USER} from '../../config/roles'

export default (sequelize, DataTypes) => {
  class Role extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Role.hasMany(models.User, {foreignKey: 'roleId'})
    }
  }

  Role.init({
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      allowNull: false,
      type: DataTypes.ENUM(ADMIN, USER),
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Role',
  })

  return Role
}
