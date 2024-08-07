import mongoose from 'mongoose';

// Define a UserSchema for storing user data
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Ensure emails are unique
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Email validation
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
});

// Create a UserModel from the schema
const UserModel = mongoose.model('User', UserSchema);

export default UserModel;
