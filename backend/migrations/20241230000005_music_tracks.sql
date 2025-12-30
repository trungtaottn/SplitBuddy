-- Music tracks table for background music
CREATE TABLE IF NOT EXISTS music_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_music_tracks_created_at ON music_tracks(created_at DESC);
