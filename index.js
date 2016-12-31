"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const GoogleMapsAPI = require("googlemaps");
const request = require("request");
const event = require("search-eventbrite");
const moment = require("moment-timezone");
const Yelp = require('yelp-api-v3');

var yelp = new Yelp({
  app_id: "g4GGJOk6feS7HoSDAfzJtw",
  app_secret: "tIJAG3oWzXTA9YJUJunB4DrDqwFtYbrGR6BrICG2U0lWk05ucvT8gvlesvrhZElt"
});

const restService = express();
restService.use(bodyParser.json());

var cityName = "";
var eType = "";
var yType = "";
var cardsSend = [];

restService.get("/p", function (req, res) {
  console.log("hook request");
  try {
      if (req) {
        if(req.query.serq){
          getNearbyEventsBrite(req, function(result) {
                     //callback is ultimately to return Messenger appropriate responses formatted correctly
                     var result;
                     console.log("results w/ getNearbyEventsBrite: ", cardsSend);
                     if(cardsSend){
                       return res.json({
                         results: cardsSend,
                       });
                     }
                     else{
                       return res.json({
                         err: "NOCARDSFOUND"
                       });
                     }
                   });
        }
        else if(req.query.yerq){
          getYelpEvents(req, function(result) {
                     //callback is ultimately to return Messenger appropriate responses formatted correctly
                     var result;
                     console.log("results w/ getYelpEvents: ", cardsSend);
                     if(cardsSend){
                       return res.json({
                         results: cardsSend,
                       });
                     }
                     else{
                       return res.json({
                         err: "NOCARDSFOUND"
                       });
                     }
                   });
        }
      }
  }
  catch (err) {
    console.error("Cannot process request", err);
    return res.status(400).json({
        status: {
            code: 400,
            errorType: err.message
        }
    });
  }
});

function getYelpEvents(req,callback) {
  cityName = "";
  yType = "";
  cardsSend = [];
  console.log("req: " + req);
  console.log("req.query.location: "+req.query.location);
  cityName = req.query.location;
  console.log("cityName: "+cityName);
  console.log("req.query.location: "+req.query.yerq);
  yType = (req.query.yerq != "undefined" && req.query.yerq != "null") ? req.query.yerq : "American";
  console.log("set yType: "+yType);
  YelpCall(callback);
}

function YelpCall(callback){
  console.log("yelp call entered");
  console.log("yelpCall yType: "+yType);
  // https://github.com/Yelp/yelp-api-v3/blob/master/docs/api-references/businesses-search.md
  yelp.search({term: yType, location: cityName, limit: 10, radius: 25, categories: "food"})
  .then(function (data) {
    console.log("got yelp response");
    console.log("data pre-JSONparse: "+data);
    var data = JSON.parse(data);
    console.log("data: "+data);
    if(data.total >= 5){
      for(var i = 0; i < 5; i++){
        if(data.businesses[i]){
          var cardObj = {
            title: "",
            image_url: "",
            subtitle: "",
            buttons: [{
              type: "web_url",
              url: "",
              title: "View Place"
            }]
          };
          cardObj.title = data.businesses[i].name;
          cardObj.image_url = data.businesses[i].image_url;
          cardObj.subtitle = data.businesses[i].location.address1;
          cardObj.buttons[0].url = data.businesses[i].url;
          cardsSend[i] = cardObj;
        }
      }
    }
    callback();
  })
  .catch(function (err) {
      console.error("yelp err: "+err);
  });
}

function getNearbyEventsBrite(req, callback) {
  cityName = "";
  eType = "";
  cardsSend = [];
  console.log("req: " + req);
  cityName = req.query.location;
  eType = (req.query.serq != "undefined" && req.query.serq != "null") ? req.query.serq : "Conference";
  console.log("cityName: "+cityName);
  console.log("eType: "+eType);
  EventbriteCall(callback);
}

function EventbriteCall(callback) {
  var params = {};
  params["q"] = eType;
  params["location.address"] = cityName;
  params["location.within"] = "30mi";
  params["sort_by"] =  "date";
  params["include_all_series_instances"] = "false";
  console.log("params: ",params);
  event.getAll(params, function(err, res, events){
      if(err){
        return console.log("err: ", err);
      }
      else{
        console.log("events: ", events);
        if(events.length > 0){
          for(var i = 0; i < 5; i++){
            if(events[i]){
              var cardObj = {
                title: "",
                image_url: "",
                subtitle: "",
                buttons: [{
                  type: "web_url",
                  url: "",
                  title: "View Event"
                }]
              };
              cardObj.title = events[i].name;
              cardObj.image_url = events[i].thumbnail;
              cardObj.subtitle = moment(events[i].start).format("MMMM Do YYYY");
              cardObj.buttons[0].url = events[i].url;
              cardsSend[i] = cardObj;
            }
          }
          events.push(events.shift());
        }
        callback();
      }
  });
}

restService.listen((process.env.PORT || 8000), function () {
  console.log("Server listening");
});
