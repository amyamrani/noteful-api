const express = require('express')
const xss = require('xss')
const path = require('path')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
  id: note.id,
  name: xss(note.name),
  modified_date: note.modified_date,
  folder_id: note.folder_id,
  content: xss(note.content),
})

notesRouter
  .route('/')

  .get((req, res, next) => {
    const knexInstance = req.app.get('db')

    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNote))
      })
      .catch(next)
  })

  .post(jsonParser, (req, res, next) => {
    const { name, modified_date, folder_id, content } = req.body
    const newNote = { name, modified_date, folder_id, content }
    const knexInstance = req.app.get('db')
    
    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }

    NotesService.insertNote(knexInstance, newNote)
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note))
      })
      .catch(next)
  })

  notesRouter
  .route('/:note_id')

  .all((req, res, next) => {
    const knexInstance = req.app.get('db')

    NotesService.getById(knexInstance, req.params.note_id)
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: `Note doesn't exist` }
          })
        }
        res.note = note // save the note for the next middleware
        next() // call next so the next middleware happens
      })
      .catch(next)
  })

  .get((req, res, next) => {
    res.json(serializeNote(res.note))
  })

  .delete((req, res, next) => {
    const knexInstance = req.app.get('db')

    NotesService.deleteNote(knexInstance, req.params.note_id)
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })

  .patch(jsonParser, (req, res, next) => {
    const { name, modified_date, folder_id, content } = req.body
    const noteToUpdate = { name, modified_date, folder_id, content }
    const knexInstance = req.app.get('db')

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'name', 'modified_date', 'folder_id' and 'content'`
        }
      })
    }

    NotesService.updateNote(
      knexInstance,
      req.params.note_id,
      noteToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

  module.exports = notesRouter