use anyhow::Result;

#[derive(Clone)]
pub struct VapidConfig {
    pub private_key: Option<String>,
    pub subject: String,
}

pub fn vapid_config(
    private_key: Option<String>,
    subject: Option<String>,
    production: bool,
) -> Result<VapidConfig> {
    let private_key = private_key
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty() && key != "your-base64-encoded-private-key");
    let subject = subject
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "mailto:admin@splitbuddy.com".to_string());

    if production && private_key.is_none() {
        anyhow::bail!("VAPID_PRIVATE_KEY must be set in production")
    }

    if !subject.starts_with("mailto:")
        && !subject.starts_with("https://")
        && !subject.starts_with("http://")
    {
        anyhow::bail!("VAPID_SUBJECT must start with mailto:, https://, or http://")
    }

    Ok(VapidConfig {
        private_key,
        subject,
    })
}

#[cfg(test)]
mod tests {
    use super::vapid_config;

    #[test]
    fn vapid_allows_missing_private_key_in_development() {
        let config = match vapid_config(None, None, false) {
            Ok(config) => config,
            Err(error) => {
                assert!(false, "{error}");
                return;
            }
        };

        assert_eq!(config.private_key, None);
        assert_eq!(config.subject, "mailto:admin@splitbuddy.com");
    }

    #[test]
    fn vapid_rejects_missing_private_key_in_production() {
        assert!(vapid_config(None, None, true).is_err());
    }

    #[test]
    fn vapid_rejects_placeholder_private_key_in_production() {
        assert!(vapid_config(
            Some("your-base64-encoded-private-key".to_string()),
            Some("mailto:admin@splitbuddy.com".to_string()),
            true,
        )
        .is_err());
    }

    #[test]
    fn vapid_rejects_invalid_subject_scheme() {
        assert!(vapid_config(
            Some("valid-key".to_string()),
            Some("admin@splitbuddy.com".to_string()),
            true,
        )
        .is_err());
    }
}
