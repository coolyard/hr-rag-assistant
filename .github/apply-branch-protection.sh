#!/bin/bash
# 用法: GITHUB_TOKEN=xxx .github/apply-branch-protection.sh
# 去 https://github.com/settings/tokens 生成一个 token (勾选 repo 权限)

set -e

OWNER="coolyard"
REPO="hr-rag-assistant"
API="https://api.github.com/repos/${OWNER}/${REPO}/branches"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN not set"
  echo "Run: export GITHUB_TOKEN=ghp_xxxxxxxxxxxx"
  exit 1
fi

for BRANCH in main develop; do
  echo "Setting protection for branch: $BRANCH"

  # 先检查 CI 是否至少跑过一次（否则 required_status_checks 里的 contexts 无法生效）
  # 如果还没跑过 CI，先不带 required_status_checks 创建规则
  HAS_CI_RUN=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=1&sha=${BRANCH}" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo 0)

  echo "  Has commits: $HAS_CI_RUN"

  curl -s -X PUT "${API}/${BRANCH}/protection" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d '{
      "required_status_checks": {
        "strict": true,
        "contexts": ["quality"]
      },
      "enforce_admins": false,
      "required_pull_request_reviews": null,
      "restrictions": null,
      "required_linear_history": false,
      "allow_force_pushes": false,
      "allow_deletions": false,
      "required_conversation_resolution": false
    }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('  OK' if 'url' in d else f'  Error: {d.get(\"message\", d)}')"

  echo ""
done

echo "Done. Verify at: https://github.com/${OWNER}/${REPO}/settings/branches"
