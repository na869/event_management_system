const mongoose = require('mongoose');
const User = require('./models/user'); // adjust path as needed

mongoose.connect('mongodb://127.0.0.1:27017/eventDB') // change DB if needed
  .then(async () => {
    await User.deleteMany({});
    console.log('✅ All users deleted');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Error connecting to DB:', err);
    process.exit(1);
  });
