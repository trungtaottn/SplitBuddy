-- Provide UUID generators without extensions (Azure may not allow uuid-ossp/pgcrypto)
-- gen_random_uuid() implementation (v4) using md5 + random
CREATE OR REPLACE FUNCTION gen_random_uuid()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
    SELECT (
        substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-' ||
        substr(md5(random()::text || clock_timestamp()::text), 9, 4) || '-' ||
        '4' || substr(md5(random()::text || clock_timestamp()::text), 13, 3) || '-' ||
        substr('89ab', (random() * 3)::int + 1, 1) ||
        substr(md5(random()::text || clock_timestamp()::text), 17, 3) || '-' ||
        substr(md5(random()::text || clock_timestamp()::text), 21, 12)
    )::uuid;
$$;

-- uuid_generate_v4() compatibility wrapper
CREATE OR REPLACE FUNCTION uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
    SELECT gen_random_uuid();
$$;
