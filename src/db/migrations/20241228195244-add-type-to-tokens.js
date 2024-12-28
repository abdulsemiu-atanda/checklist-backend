'use strict';
const {PASSWORD, SHARING} = require('../../config/tokens')
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.addColumn('Tokens', 'type', {
      allowNull: false,
      type: Sequelize.ENUM(PASSWORD, SHARING),
      defaultValue: PASSWORD
    })
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    await queryInterface.removeColumn('Tokens', 'type')
    await queryInterface.sequelize.query('DROP type "enum_Tokens_type"')
  }
};
