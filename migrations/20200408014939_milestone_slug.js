const milestones = [
    {
        slug: 'intro presentation',
        name: 'Презентация проекта'
    },
    {
        slug: 'testing protocol',
        name: 'Протокол тестирования'
    },
    {
        slug: 'proof of work',
        name: 'Подтверждение эксплуатации'
    },
    {
        slug: 'final presentation',
        name: 'Финальная презентация на сайт ШИР'
    }
]

exports.up = function(knex) {
    return knex.schema
        .table('documents', (t) => {
            t.string('milestone_slug')
                .notNullable()
                .defaultTo('')
                .comment('Краткое название периода, к которому относится документ')
        })
        .raw(
            milestones
                .map(({ slug }, i) => `UPDATE documents SET milestone_slug = '${slug}' WHERE milestone = ${i}'`)
                .join(';')
        )
        .table('documents', (t) => t.dropColumn('milestone'))
}

exports.down = function(knex) {
    console.warn('  !!!  Milestone slugs are not completable to milestone ids!  !!!  ')
    return knex.schema.table('documents', (t) => {
        t.dropColumn('milestone_slug')
        t.integer('milestone')
            .notNullable()
            .defaultTo(-1)
            .comment('Номер периода, к которому относится этот документ')
    })
}
