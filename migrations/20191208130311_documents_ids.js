exports.up = function(knex) {
    return knex.schema.alterTable('documents', (t) => {
        t.increments('documentId').primary().alter()
    })
}
exports.down = function(knex) {
    return knex.schema.alterTable('documents', (t) => {
        t.integer('documentId').primary().alter()
    })
}
