This is a [Next.js](https://nextjs.org/) project bootstrapped with
[`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Dev

1. Install dependencies

   ```
   npm install
   ```

2. Install pg locally and get the DATABASE_URL

3. Add .env file like in .env.example

4. To change postgres schema, edit `src/schema.ts` and run
   `npx drizzle-kit push`

Using:

- Nextjs for UI
- Auth.js for login
- Drizzle for pg ORM: https://orm.drizzle.team/docs/get-started/postgresql-new

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.
