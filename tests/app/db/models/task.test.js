import {expect} from 'chai'

import {v4 as uuidV4} from 'uuid'
import db from '../../../../src/db/models'
import {fakeUser} from "../../../fixtures/users"
import {create} from '../../../fixtures'
import {CREATED} from "../../../../src/config/tasks"

const Task = db.Task

let task 
let user

describe('Task Model:', () => {
  before(done => {
    db.sequelize.sync({force:true}).then(() => {
        create({type: 'users', data: fakeUser}).then(([record]) => {
          task = Task.build({title: 'shopping', description: 'to-do', status: CREATED, userId: record.id})
          user = record

          done()
      })
    })
  })

  after(done => {
    db.sequelize.sync({force: true}).then(() => { done() })
  })

  it('creates an instance of task', () => {
    expect(task).to.exist
  })

  it('saves record successfully', done => {
    task.save().then(record => {
      task = record

      expect(record.title).to.equal('shopping')
      expect(record.description).to.equal('to-do')
      expect(record.status).to.equal(CREATED)
      expect(record.userId).to.equal(user.id)

      done()
    })
  })

  it('throws an error if title is missing', done => {
    Task.create({description:'to-do', status: CREATED, userId: user.id}).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(error => {
      expect(error.message).to.equal('notNull Violation: Task.title cannot be null')

      done()
    })
  })

  it('throws an error if user does not exist', done => {
    Task.create({title:'shopping', description:'to-do', status: CREATED, userId: uuidV4()}).then(record => {
      expect(record).to.not.exist

      done()
    }).catch(error => {
      expect(error.message).to.equal('insert or update on table "Tasks" violates foreign key constraint "Tasks_userId_fkey"')
  
      done()
    })
  })

  it('sets status to CREATED when not specified', done => {
    Task.create({title: 'shopping', description:'to-do', userId: user.id}).then(record => {
      expect(record.status).to.equal(CREATED)

      done()
    }) 
  })
})
