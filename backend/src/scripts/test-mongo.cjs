const mongoose = require('mongoose');
const uri = "mongodb://yashmoteriya021_db_user:ayXKCkoxudctwaHW@ac-hqfp0jk-shard-00-00.2pwyzey.mongodb.net:27017,ac-hqfp0jk-shard-00-01.2pwyzey.mongodb.net:27017,ac-hqfp0jk-shard-00-02.2pwyzey.mongodb.net:27017/schemesetu?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("Successfully connected without SRV!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection failed:", err);
    process.exit(1);
  });
