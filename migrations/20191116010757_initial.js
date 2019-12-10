exports.up = function(knex) {
    return knex.schema
        .createTable('teams', (t) => {
            t.increments('teamId').primary()
            t.integer('capacity')
                .unsigned()
                .defaultTo(5)
            t.string('name')
                .notNullable()
                .unique()
            t.string('schoolName').notNullable()
            t.string('trelloCardId').nullable()
            t.string('gdriveFolderId')
        })
        .createTable('bot_users', (t) => {
            t.integer('tgId').primary()
            t.string('fullName').notNullable()
            t.integer('teamId')
                .references('teams.teamId')
                .onDelete('CASCADE')
        })
        .createTable('documents', (t) => {
            t.integer('ownerTeam')
                .references('teams.teamId')
                .onDelete('NO ACTION')
            t.increments('documentId').primary()
            // TODO возможно для milestone'ов надо будет сделать отдельную таблицу
            t.integer('milestone')
                .notNullable()
                .comment('Номер периода, к которому относится этот документ')
            t.string('gdriveFileId').notNullable()
            t.string('trelloAttachmentId')
            t.dateTime('attachedTime', { useTz: true })
                .defaultTo(knex.fn.now())
                .comment('Время загрузки документа')
        })
}

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('bot_users')
        .dropTableIfExists('teams')
        .dropTableIfExists('documents')
}
