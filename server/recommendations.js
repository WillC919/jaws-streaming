const express = require('express');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const app = express();

// MongoDB setup (using Mongoose as an example)
const User = require('./models/User'); // User model for MongoDB
const Video = require('./models/Video'); // Video model for MongoDB

mongoose.connect('mongodb://localhost:27017/milestone-1', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function getInteractions() {
    const users = await User.find({});
    const interactions = [];

    for (let i = 0; i < users.length; i++) {
        for (let y = 0; y < users[i].liked.length; y++) {
            const video = await Video.findById(users[i].liked[y]);
            let interaction = {
                userId: users[i].id,
                itemId: video.id,
                rating: 5
            };
            interactions.push(interaction);
        }

        for (let y = 0; y < users[i].disliked.length; y++) {
            const video = await Video.findById(users[i].disliked[y]);
            let interaction = {
                userId: users[i].id,
                itemId: video.id,
                rating: 1
            };
            interactions.push(interaction);
        }

    }
    // console.log("interactions " + interactions);
    return interactions;
}

async function makeRecommendations(id, count) {
    // Dynamically import Recommender from disco-rec
    const { Recommender } = await import('disco-rec');
    const videos = await Video.find({});
    const user = await User.findById(id);
    
    const interactions = await getInteractions();
    if (interactions.length == 0)
    {
        const recommendations = [];
        const recommendedItemIds = new Set(recommendations.map(rec => rec.itemId.toString()));
        const watchedItemIds = new Set(user.watched.map(video => video._id.toString()));
        const likedItemIds = new Set(user.liked.map(video => video._id.toString()));

        while (recommendations.length < count)
        {
            const randomItem = videos[Math.floor(Math.random() * videos.length)];
            const randomItemId = randomItem._id;

            if(!recommendedItemIds.has(randomItemId.toString()) && !watchedItemIds.has(randomItemId.toString()) && !likedItemIds.has(randomItemId.toString()))
            {
                recommendations.push({ itemId: randomItemId.toString(), score: 0 }); 
                recommendedItemIds.add(randomItemId.toString());
            }
        }
        return recommendations;
    }

    const recommender = new Recommender();
    recommender.fit(interactions);
    
    // const userIndex = user.index;
    const recommendationsFromMl = recommender.userRecs(id, count);
    const recommendedItemIds = new Set(recommendationsFromMl.map(rec => rec.itemId.toString()));
    const watchedItemIds = new Set(user.watched.map(video => video._id.toString()));
    const likedItemIds = new Set(user.liked.map(video => video._id.toString()));
    var recommendations = recommendationsFromMl;

    console.log("before");
    console.log(recommendations);
    const recFiltered = recommendations.filter((item) => !watchedItemIds.has(item.itemId));

    console.log(recommendations);
    recommendations = recFiltered;
    console.log(recFiltered);
    
    if (recommendations.length < count)
    {
        while (recommendations.length < count)
        {
            const randomItem = videos[Math.floor(Math.random() * videos.length)];
            const randomItemId = randomItem._id;

            if (!recommendedItemIds.has(randomItemId.toString()) && !watchedItemIds.has(randomItemId.toString()))// && !likedItemIds.has(randomItemId.toString()))
            {
                recommendations.push({ itemId: randomItemId.toString(), score: 0 }); 
                recommendedItemIds.add(randomItemId.toString());
            }
        }
    }
    return recommendations;
}

module.exports = {
    getInteractions,
    makeRecommendations,
};