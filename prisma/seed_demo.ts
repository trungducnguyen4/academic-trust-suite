import { main } from './seed';

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
