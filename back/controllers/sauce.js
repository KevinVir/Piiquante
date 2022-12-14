const Sauce = require('../models/Sauce');

const fs = require('fs');

// Création d'une sauce
exports.createSauce = (req, res, next) => {
    // Récupération du contenu de sauce
    const sauceObject = JSON.parse(req.body.sauce);
    // Supression de id car mongoDB en créer automatiquement
    delete sauceObject._id;
    // Création de l'objet avec ce qui a été crée précedemment
    const sauce = new Sauce({
        ...sauceObject,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`,
    });

    // On enregistre les infos reçus dans la database avec save
    sauce.save()
        .then(() => res.status(201).json({ message: 'Sauce enregistrée !' }))
        .catch((error) => res.status(400).json({ error: error }))
};

// Modifier une sauce
exports.modifySauce = (req, res, next) => {
    // Vérification d'une présence d'un champ file dans le requête
    const sauceObject = req.file ? {
        // Si la requête contient une nouvelle image
        ...JSON.parse(req.body.sauce),
        // On récupère l'url de l'image
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
        // Si la requête ne contient pas de nouvelle image
    } : { ...req.body };

    delete sauceObject._userId;

    Sauce.findOne({ _id: req.params.id })
        .then((sauce) => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({ message: 'Not authorized' });
            } else {
                Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Sauce modifiée !' }))
                    .catch(error => res.status(401).json({ error }));
            }
        })
        .catch((error) => {
            res.status(400).json({ error });
        });
};

// Supression d'une sauce
exports.deleteSauce = (req, res, next) => {
    // On récupère la sauce dans la base de donnée
    Sauce.findOne({ _id: req.params.id })
        .then(sauce => {
            if (sauce.userId != req.auth.userId) {
                res.status(401).json({ message: 'Non autorisé' });
            } else {
                const filename = sauce.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Sauce.deleteOne({ _id: req.params.id })
                        .then(() => { res.status(200).json({ message: 'Sauce supprimée !' }) })
                        .catch(error => res.status(401).json({ error }));
                });
            }
        })
        .catch(error => {
            res.status(500).json({ error });
        });
};

// Récupération d'une sauce en fonction de son ID
exports.getOneSauce = (req, res, next) => {
    // Utilisation de findOne dans le model Sauce pour trouver l'article unique ayant le même id que le param de la requête
    Sauce.findOne({ _id: req.params.id })
        .then((sauce) => res.status(200).json(sauce))
        .catch((error) => res.status(404).json({ error: error }))
};

// Récupération des sauces
exports.getAllSauces = (req, res, next) => {
    // Utilisation de find afin de renvoyer un tableau qui contient toutes les sauces
    Sauce.find()
        .then((sauces) => res.status(200).json(sauces))
        .catch((error) => res.status(400).json({ error: error }))
};

exports.likeSauce = (req, res, next) => {

    // Si la requête est un like
    if (req.body.like === 1) {

        // Ajout du like à la sauce et de l'utilisateur dans l'array userLiked
        Sauce.updateOne({ _id: req.params.id }, { $inc: { likes: req.body.like++ }, $push: { usersLiked: req.body.userId } })
            .then((sauce) => res.status(200).json({ message: 'Like ajouté !' }))
            .catch(error => res.status(400).json({ error }))

        // Si la requête est un dislike
    } else if (req.body.like === -1) {

        // Ajout du dislike à la sauce et de l'utilisateur dans l'array userDisliked
        Sauce.updateOne({ _id: req.params.id }, { $inc: { dislikes: (req.body.like++) * -1 }, $push: { usersDisliked: req.body.userId } })
            .then((sauce) => res.status(200).json({ message: 'Dislike ajouté !' }))
            .catch(error => res.status(400).json({ error }))

        // Si la requête est une annulation
    } else {
        Sauce.findOne({ _id: req.params.id })
            .then(sauce => {

                // Si l'annulation concerne un like et que l'utilisateur est présent dans l'array userLiked
                if (sauce.usersLiked.includes(req.body.userId)) {

                    // Supression du like et de l'utilisateur dans l'array userLiked
                    Sauce.updateOne({ _id: req.params.id }, { $pull: { usersLiked: req.body.userId }, $inc: { likes: -1 } })
                        .then((sauce) => { res.status(200).json({ message: 'Like supprimé !' }) })
                        .catch(error => res.status(400).json({ error }))

                    // Si l'annulation concerne un dislike et que l'utilisateur est présent dans l'array userDisliked
                } else if (sauce.usersDisliked.includes(req.body.userId)) {

                    // Supression du dislike et de l'utilisateur dans l'array userDisliked
                    Sauce.updateOne({ _id: req.params.id }, { $pull: { usersDisliked: req.body.userId }, $inc: { dislikes: -1 } })
                        .then((sauce) => { res.status(200).json({ message: 'Dislike supprimé !' }) })
                        .catch(error => res.status(400).json({ error }))
                }
            })
            .catch(error => res.status(400).json({ error }))
    }
};