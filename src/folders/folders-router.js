const express = require('express')
const xss = require('xss')
const path = require('path')
const FoldersService = require('./folders-service')

const foldersRouter = express.Router()
const jsonParser = express.json()

const serializeFolder = folder => ({
  id: folder.id,
  name: xss(folder.name),
})

foldersRouter
  .route('/')

  .get((req, res, next) => {
    const knexInstance = req.app.get('db')

    FoldersService.getAllFolders(knexInstance)
      .then(folders => {
        res.json(folders.map(serializeFolder))
      })
      .catch(next)
  })

  .post(jsonParser, (req, res, next) => {
    const { name } = req.body
    const newFolder = { name }
    const knexInstance = req.app.get('db')
    
    for (const [key, value] of Object.entries(newFolder)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }

    FoldersService.insertFolder(knexInstance, newFolder)
      .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder))
      })
      .catch(next)
  })

  foldersRouter
  .route('/:folder_id')

  .all((req, res, next) => {
    const knexInstance = req.app.get('db')

    FoldersService.getById(knexInstance, req.params.folder_id)
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `Folder doesn't exist` }
          })
        }
        res.folder = folder // save the folder for the next middleware
        next() // call next so the next middleware happens
      })
      .catch(next)
  })

  .get((req, res, next) => {
    res.json(serializeFolder(res.folder))
  })

  .delete((req, res, next) => {
    const knexInstance = req.app.get('db')

    FoldersService.deleteFolder(knexInstance, req.params.folder_id)
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

  .patch(jsonParser, (req, res, next) => {
    const { name } = req.body
    const folderToUpdate = { name }
    const knexInstance = req.app.get('db')

    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'name'`
        }
      })
    }

    FoldersService.updateFolder(
      knexInstance,
      req.params.folder_id,
      folderToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

  module.exports = foldersRouter