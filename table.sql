CREATE TABLE "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expires" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;