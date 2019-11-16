import Knex from 'knex'
import {Model} from "objection";
import Team from "./models/Team";


const knex = Knex({
    ...require('../knexfile.js')[process.env.NODE_ENV || 'development']
});


Model.knex(knex);


async function main() {


    let b = await Team.query().findByIds([1, 2, 3]);
    console.log(b);
}


Promise.resolve()
    .then(() => knex.migrate.latest())
    .then(() => main())
    .catch(console.error);

console.log(Team);
