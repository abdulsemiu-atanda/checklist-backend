'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Tokens', 'tokenableId')
    await queryInterface.removeColumn('Tokens', 'tokenableType')
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.addColumn('Tokens', 'tokenableId', Sequelize.UUID)
    await queryInterface.addColumn('Tokens', 'tokenableType', Sequelize.STRING)
  }
};
