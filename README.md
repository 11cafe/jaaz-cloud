This is a [Next.js](https://nextjs.org/) project bootstrapped with
[`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

dev branch is deployed to https://dev-nodecafe.onrender.com/

## Dev

1. Clone the repository locally. Since there are submodules, use the command:

   ```
   git clone --recursive https://github.com/11cafe/comfyspace.git
   ```

2. Install dependencies

   ```
   npm install
   ```

3. then symlink ComfyUI/web to public/web
   `ln -s /path/to/your/project/comfyui-fork/web /path/to/your/project/public/web`
4. copy .env.example into .env and fill in required variables

5. Apply for an AWS IAM account from the warehouse manager, create an access key
   after logging in, and fill it in .env.local;
6. Start the project

   ```
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.
