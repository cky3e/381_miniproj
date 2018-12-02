var http = require('http');
var url = require('url');
var express = require('express');
var fs = require('fs');
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var bodyParser = require('body-parser');
var session = require('cookie-session');
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var mongourl = "mongodb://miniproj:mini381@ds117334.mlab.com:17334/miniproj";
var formidable = require('formidable');

var app = express();
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

//session
var SECRETKEY1 = 'abc';
var SECRETKEY2 = 'def';

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));


//redirect to login.
app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
    res.redirect('/login');
	} else {
		res.redirect('/list');
	}
});

//Login
app.get('/login',function(req,res) {
  res.render('login');
});

app.post('/login',function(req,res) {
  MongoClient.connect(mongourl, function(err,db) {
    try {
      assert.equal(err,null);
    } catch (err) {
      res.writeHead(500,{"Content-Type":"text/plain"}); 
      res.end("MongoClient connect() failed!");
    }
    var r = {};
    r.name = req.body.name;
    r.password = req.body.password;
    var cursor = db.collection('user').find(r);
    var result = [];
    cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
        result.push(doc);
      }
    }); 
    req.session.authenticated = true;
    req.session.username = r.name;
    res.redirect('/');
  });
});

//Logout
app.get('/logout',function(req,res) {
  req.session = null;
  res.redirect('/');
});

// register
app.get('/createAccount',function(req,res) {
  res.render('createAccount');
});

app.post('/createAccount',function(req,res) {
  MongoClient.connect(mongourl, function(err,db) {
    try {
      assert.equal(err,null);
    } catch (err) {
      res.writeHead(500,{"Content-Type":"text/plain"}); 
      res.end("MongoClient connect() failed!");
    }
    var r = {};
    r.name = req.body.name;
    r.password = req.body.password;
    db.collection('user').insertOne(r,function(err) {
      assert.equal(err,null);
      db.close();
      res.redirect('/');
    });
  });
});

//Create restaurant doc.
app.get('/new',function(req,res) {
  if(req.session.username == ""||req.session.username == null){
      res.redirect('/login');
    }
    else{
  res.render('new',{session:req.session.username});}
});

app.post('/new',function(req,res) {
  var owner = req.session.name;
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var filename = files.filetoupload.path;
      if (fields.title) {
        var title = (fields.title.length > 0) ? fields.title : "untitled";
      }
      if (files.filetoupload.type) {
        var mimetype = files.filetoupload.type;
      }
      fs.readFile(filename, function(err,data) {
        MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          console.log("MongoClient connect() succeed!");
          if(files.filetoupload!=null){
            var image = new Buffer(data).toString('base64');
          }
          else{
            var image = null;
          }
          var new_r = {
            "name": fields.name, 
            "borough": fields.borough,
            "cuisine":fields.cuisine, 
            "photo": image, 
            "photo_minetype": mimetype, 
            "address": {
                      "street": fields.street,
                      "building": fields.building, 
                      "zipcode": fields.zipcode, 
                      "coord": [fields.lon, fields.lat]
                }, 
            "grades":[],
            "owner" : req.session.username
              };
          insertRestaurants(db,new_r,function(result) {
            db.close();
            res.render('created');
          })
        })
      });
    });
});

//Update restaurant doc.
app.get('/update',function(req,res) {
if(req.session.username == ""||req.session.username == null){
      res.redirect('/login');
    } else {
  var restaurant_id = new mongo.ObjectID(req.query.id);
  var query1 = {_id: restaurant_id};
  console.log("MongoClient connect() succeed!");
  MongoClient.connect(mongourl,function(err,db) {
    console.log("MongoClient connect() succeed!");
      checkRestaurant(db,query1,function(result) {
        db.close();
        console.log(result[0]);
        if(result[0].owner!=req.session.username){
        res.redirect('/notowner');
        } else {
        res.render('update',{result:result[0],session:req.session.username});
          }
      });
    })
  }
});
app.post('/update',function(req,res) {
  var owner = req.session.name;
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var filename = files.filetoupload.path;
      if (fields.title) {
        var title = (fields.title.length > 0) ? fields.title : "untitled";
      }
      if (files.filetoupload.type) {
        var mimetype = files.filetoupload.type;
      }
      fs.readFile(filename, function(err,data) {
        MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          console.log("MongoClient connect() succeed!");
          var image;
          var new_r;
          //if(files.filetoupload != null && files.filetoupload != "" ){
            image = new Buffer(data).toString('base64');
            var new_r = {
              "name": fields.name,
               "borough": fields.borough,
               "cuisine":fields.cuisine, 
               "photo": image, 
               "photo_minetype": mimetype, 
               "address": {
                          "street": fields.street, 
                          "building": fields.building, 
                          "zipcode": fields.zipcode, 
                          "coord": [fields.lon, fields.lat]}, 
                "owner" : req.session.username
              };
          /*} else {
            var new_r = {
              "name": fields.name, 
              "borough": fields.borough,
              "cuisine":fields.cuisine, 
              "photo": image, 
              "photo_minetype": mimetype, 
              "address": {
                          "street": fields.street, 
                          "building": fields.building, 
                          "zipcode": fields.zipcode, 
                          "coord": [fields.lon, fields.lat]}, 
              "owner" : req.session.username
              };
          }*/
          var restaurant_id = new mongo.ObjectID(req.query.id);
          var query = {_id: restaurant_id};
              updateRestaurants(db,query,new_r,function(result) {
              db.close();
              res.redirect('/display?id='+req.query.id);
              });
        });
      });
    });  
});

// Rate
app.get('/rate',function(req,res) {
  if(req.session.username == ""||req.session.username == null){
      res.redirect('/login');
    } else {
  var restaurant_id = new mongo.ObjectID(req.query.id);
  var query1 = {_id: restaurant_id};
  MongoClient.connect(mongourl,function(err,db) {
    console.log("MongoClient connect() succeed!!!");
    checkRestaurant(db,query1,function(result) {
      db.close();
      console.log(result[0]);
      var have = 0;
      result[0].grades.forEach(function(grade){
        if(grade.user==req.session.username){ 
          have = 1;
        }
      });
      if(have ==1){
      res.redirect('/rated');
      } else {
      res.render('rate',{id: req.query.id,session:req.session.username});  
      }
  });
  });
  }
});

app.post('/rate',function(req,res) {
  var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          console.log("MongoClient connect() succeed!");
          var r = {"grades": {"user": req.session.username, "score": fields.score}};
          var restaurant_id = new mongo.ObjectID(req.query.id);
          var query = {_id: restaurant_id};
        rateRestaurants(db,query, r,function(result) {
          db.close();
          res.render('ratesuccess');
        });
      });
  });
});
//Rated
app.get('/rated',function(req,res) {
  res.render('rated');
});

//Search restaurants
app.get('/search',function(req,res) {
  if(req.session.username == ""||req.session.username == null){
      res.redirect('/login');
    }
  else{res.render('search',{session:req.session.username});}
});
app.post("/search", function(req,res) {
  var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      console.log('test2');
        MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          console.log("MongoClient connect() succeed!");
          var query = {name :fields.field};
        search(db,query,function(result) {
        db.close();
        res.render('searchlist',{result:result,session:req.session.username});
        });     
    });
});
});


// list all the restaurants
 app.get('/list',function(req,res) {   
 if(req.session.username == ""||req.session.username == null){
      res.redirect('/login');
    } else {
    MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          } 
          console.log("MongoClient connect() succeed!");
      listRestaurants(db,function(result){     
      db.close();
      res.render('list', {result:result,session:req.session.username});
    });
  });
  } 
});

//Display info of restaurant
app.get('/display',function(req,res) {    
    if(req.session.username == ""||req.session.username == null){
      res.redirect('/login');
    } else {
    MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          var restaurant_id = new mongo.ObjectID(req.query.id);
          var query = {_id: restaurant_id};
          console.log("MongoClient connect() succeed!");  
      displayRestaurants(db,query,function(result){     
      db.close();
      res.render('display', {result:result[0],session:req.session.username});
    });
  });
  }
});

//Delete restaurant doc.
app.get('/delete',function(req,res) { 
    if(req.session.username == ""||req.session.username == null){
      res.redirect('/login');
    } else {
    MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          var restaurant_id = new mongo.ObjectID(req.query.id);
          var query = {_id: restaurant_id , owner: req.session.username};
          console.log("MongoClient connect() succeed!");
      deleteRestaurants(db,query,function(result){     
      db.close();
      console.log(result);
      res.render('deleted'); 
    });
  });
  }
});
// if not the owner
app.get('/notowner',function(req,res) {
  res.render('notowner');
});

//Google map
app.get("/gmap", function(req,res) {
  res.render("gmap.ejs", {
    lat:req.query.lat,
    lon:req.query.lon,
    zoom:req.query.zoom
  });
  res.end();
});

//Restful services(name)
app.get('/api/restaurant/name/:name',function(req,res){
    var query = {name:req.params.name};
    MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          console.log("MongoClient connect() succeed!");
        search(db,query,function(result) {
        db.close();
        res.status(200).json(result);
        res.end();
        });
});
});

//Restful services(borough)
app.get('/api/restaurant/borough/:borough',function(req,res){
    var query = {name:req.params.borough};
    MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          console.log("MongoClient connect() succeed!");
        search(db,query,function(result) {
        db.close();
        res.status(200).json(result);
        res.end();
        });
});
});

//Restful services(cuisine)
app.get('/api/restaurant/cuisine/:cuisine',function(req,res){
    var query = {name:req.params.cuisine};
    MongoClient.connect(mongourl,function(err,db) {
          try {
            assert.equal(err,null);
          } catch (err) {
            res.writeHead(500,{"Content-Type":"text/plain"});
            res.end("MongoClient connect() failed!");
          }
          console.log("MongoClient connect() succeed!");
        search(db,query,function(result) {
        db.close();
        res.status(200).json(result);
        res.end();
        });  
});
});

//Function List
function insertRestaurants(db,new_r,callback) {
  db.collection('restaurantTest').insertOne(new_r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    callback(result);
  });
}

function updateRestaurants(db,query,new_r,callback) {
  db.collection('restaurantTest').update(query, {$set : new_r},function(err,result) {
    assert.equal(err,null);
    console.log("update was successful!");
    callback(result);
  });
}

function rateRestaurants(db,query,r,callback) {
  db.collection('restaurantTest').update(query, {$push: r},function(err,result) {
    assert.equal(err,null);
    console.log("rate was successful!");
    callback(result);
  });
}

function displayRestaurants(db,query,callback){
  var result = [];
  var cursor = db.collection('restaurantTest').find(query);   
  cursor.each(function(err, doc) {
    assert.equal(err, null); 
    if (doc != null) {
      result.push(doc);
    } else {
      callback(result);
    }
  });
}

function checkRestaurant(db,query1,callback){ 
  var result = [];
  var cursor = db.collection('restaurantTest').find(query1);
  cursor.each(function(err, doc) {
    assert.equal(err, null); 
    if (doc != null) {
      result.push(doc);
    } else {
      callback(result);
    }
  });
}

function listRestaurants(db,callback){
  var result = [];
  var cursor = db.collection('restaurantTest').find();
  cursor.each(function(err, doc) {
    assert.equal(err, null); 
    if (doc != null) {
      result.push(doc);
    } else {
      callback(result);
    }
  });
}

function search(db,query,callback){
  var result = [];
  var cursor = db.collection('restaurantTest').find(query);
  cursor.each(function(err, doc) {
    assert.equal(err, null); 
    if (doc != null) {
      result.push(doc);
    } else {
      callback(result);
    }
  });
}

function deleteRestaurants(db,query,callback){ 
  db.collection('restaurantTest').remove(query,function(err,result) {
    assert.equal(err,null);
    console.log("delete was successful!");
    callback(result);
  });
}

app.listen(process.env.PORT || 8099); 