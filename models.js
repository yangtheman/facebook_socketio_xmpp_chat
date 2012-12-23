function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;

  User = new Schema({
    'fbid': String,
    'username': String,
    'accessToken': String
  });
  
  User.method('findOrCreate', function(fbuser) {
    User.findOne({ fbid: fbuser['fbid'] }, function (err, doc){
      if (doc == null) {
        var user = new User(fbsuer);
        user.save(function (err) {
          if (err) throw err;
        });
      }
    });
  }); 
  
  User.method('getFBToken', function(fbuser) {
    User.findOne({ fbid: fbuser['fbid'] }, function (err, doc) {
      if (doc) {
        return doc.accessToken;
      }
    })
  })

  mongoose.model('User', User);

  fn();
}

exports.defineModels = defineModels;