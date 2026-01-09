#!/bin/bash
# Script to update backend version in Cargo.toml
# Only updates when on main branch and in CI/CD

set -e

CARGO_TOML="Cargo.toml"
VERSION_FILE="VERSION"

# Get current branch
get_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

# Get git commit hash (short)
get_commit_hash() {
    git rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

# Get latest git tag
get_latest_tag() {
    git describe --tags --abbrev=0 2>/dev/null || echo ""
}

# Check if we're in CI/CD
is_ci() {
    [ "$CI" = "true" ] || [ "$GITHUB_ACTIONS" = "true" ]
}

# Check if we're on main branch
is_main_branch() {
    local branch=$(get_branch)
    [ "$branch" = "main" ] || [ "$branch" = "refs/heads/main" ]
}

# Extract current version from Cargo.toml
get_current_version() {
    grep "^version = " "$CARGO_TOML" | sed 's/version = "\(.*\)"/\1/' | tr -d ' '
}

# Update version in Cargo.toml
update_version() {
    local new_version=$1
    local current_version=$(get_current_version)
    
    if [ "$current_version" = "$new_version" ]; then
        echo "✅ Version already up to date: $new_version"
        return 0
    fi
    
    # Update Cargo.toml
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/^version = \".*\"/version = \"$new_version\"/" "$CARGO_TOML"
    else
        # Linux
        sed -i "s/^version = \".*\"/version = \"$new_version\"/" "$CARGO_TOML"
    fi
    
    echo "✅ Updated version in $CARGO_TOML: $current_version -> $new_version"
}

# Generate new version
generate_version() {
    local branch=$(get_branch)
    local commit_hash=$(get_commit_hash)
    
    # In CI/CD on main branch: use tag or semantic version
    if is_ci && is_main_branch; then
        local tag=$(get_latest_tag)
        if [ -n "$tag" ]; then
            # Extract version from tag (e.g., v1.0.0 -> 1.0.0)
            local version=$(echo "$tag" | sed 's/^v//')
            update_version "$version"
            echo "$version" > "$VERSION_FILE"
            return 0
        fi
        # No tag, use commit hash as patch version
        local current=$(get_current_version)
        local base_version=$(echo "$current" | sed 's/\.[0-9]*$//')
        update_version "${base_version}.${commit_hash}"
        echo "${base_version}.${commit_hash}" > "$VERSION_FILE"
        return 0
    fi
    
    # On main branch locally: only update if commit changed
    if is_main_branch && ! is_ci; then
        local tag=$(get_latest_tag)
        if [ -n "$tag" ]; then
            local version=$(echo "$tag" | sed 's/^v//')
            update_version "$version"
            echo "$version" > "$VERSION_FILE"
            return 0
        fi
        # Check if VERSION file exists and matches current commit
        if [ -f "$VERSION_FILE" ]; then
            local stored_commit=$(git rev-parse HEAD 2>/dev/null || echo "")
            local file_commit=$(cat "$VERSION_FILE.commit" 2>/dev/null || echo "")
            if [ "$stored_commit" = "$file_commit" ] && [ -n "$stored_commit" ]; then
                echo "✅ Version unchanged (commit: $commit_hash)"
                return 0
            fi
        fi
        # Update with commit hash
        local current=$(get_current_version)
        local base_version=$(echo "$current" | sed 's/\.[0-9]*$//')
        update_version "${base_version}.${commit_hash}"
        echo "${base_version}.${commit_hash}" > "$VERSION_FILE"
        echo "$(git rev-parse HEAD)" > "$VERSION_FILE.commit"
        return 0
    fi
    
    # Dev branch or local: keep current version, just update VERSION file
    local current=$(get_current_version)
    echo "$current" > "$VERSION_FILE"
    echo "✅ Keeping version: $current (branch: $branch)"
}

generate_version
