import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // هنكتب الرابط هنا مباشرة عشان نلغي أي لبس
    url: "postgresql://postgres:27122022@localhost:5432/easyflow_db?schema=public",
  },
});
