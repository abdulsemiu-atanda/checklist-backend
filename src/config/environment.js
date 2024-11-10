import {config} from 'dotenv'

const loader = () => {
  config({path: ['.env', `.env.${process.env.NODE_ENV || 'development'}`]})
}

export default loader
