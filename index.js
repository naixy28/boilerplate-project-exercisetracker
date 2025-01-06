const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const morgan = require('morgan')
require('dotenv').config()
const mongoose = require('mongoose')
const req = require('express/lib/request')

const User = mongoose.model('User', mongoose.Schema({
  username: {
    type:String,
    required: true,
    unique: true,
    trim: true, 
  }
}))

const exerciseSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now
  },
})
exerciseSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.date = doc.date.toDateString()
    return ret
  }
})
const Exercise = mongoose.model('Exercise', exerciseSchema)

const connect = async () => {
  try {
    await mongoose.connect('mongodb+srv://freecodecamp:Freecodecamp@cluster0.hal4e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    console.log('connected to mongodb')
  } catch (e) {
    console.log(e)
  }
}

connect()
app.use(cors())
app.use(morgan('tiny'))
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const {username} = req.body
  // check if exist
  try {
    const exist = await User.findOne({ username }).exec()
    if (!!exist) {
      return res.json({msg: 'user already exist'})
    }
  
    const newUser = new User({
      username
    })
    await newUser.save()
    res.json({
      username: newUser.username,
      _id: newUser._id
    })
  } catch (e) {
    console.log(e)
    res.json({error: e?.message})
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (e) {
    res.json({error: e?.message})
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const {_id} = req.params
    const { description, duration, date } = req.body
    // id exist?
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.json({msg: 'id not valid'})
    }
    const userExists = await User.findOne({ _id }).exec()
    if (!userExists) {
      return res.json({msg: 'user not exist'})
    }

    const newExercise = await Exercise.create({
      description,
      duration,
      userId: _id,
      date: !!date ? new Date(date) : undefined
    })

    res.json({...userExists.toJSON(),
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date
    })
  } catch (e) {
    res.json({error: e?.message})
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params
    const { from, to, limit } = req.query

    const query = {
      userId: _id
    }

    if (from) {
      const fromDate = new Date(from)
      if (isNaN(fromDate)){
        throw new Error(
          'from date is not valid'
        )
      } else {
        query.date = { ...query.date, $gte: fromDate}
      }
    }

    if (to) {
      const toDate = new Date(to)
      if (isNaN(toDate)){
        throw new Error(
          'to date is not valid'
        )
      } else {
        query.date = { ...query.date, $lte: toDate}
      }
    }

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.json({msg: 'id not valid'})
    }
    let log = Exercise.find(query).sort({date: 1})
    const count = await Exercise.countDocuments({userId: _id})

    if (limit) {
      const logLimit = parseInt(limit, 10)
      if (isNaN(logLimit)) {
        return res.json({msg: 'limit not valid'})
      }
      log = log.limit(logLimit)
    }
    log = await log

    return res.json({
      count,
      log,
    })
  } catch (e) {
    res.json({error: e?.message})
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
