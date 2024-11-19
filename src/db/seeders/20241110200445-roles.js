'use strict';

import { v4 as uuidV4 } from 'uuid'

import {dateToISOString} from '../../util/tools'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */

    await queryInterface.bulkInsert('Roles', [
      {id: uuidV4(), name: 'admin', createdAt: dateToISOString(Date.now()), updatedAt: dateToISOString(Date.now())},
      {id: uuidV4(), name: 'user', createdAt: dateToISOString(Date.now()), updatedAt: dateToISOString(Date.now())},
    ], {})
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */

    await queryInterface.bulkDelete('Roles', null, {});
  }
};
