# Fact-Checker

このリポジトリは、Twitter/X上の投稿をリアルタイムで監視し、自動的にファクトチェックを行うシステムです。

## 概要

Fact-Checkerは以下の機能を提供します：

- **Twitter/X監視**: 特定の話題に関する投稿を自動的に検索・監視
- **AI powered ファクトチェック**: OpenAIのGPTモデルとベクターストアを使用して、投稿内容の真偽を判定
- **Slack通知**: 誤った情報が検出された場合、自動的にSlackに通知を送信
- **CLI & Web API**: コマンドラインツールとしても、Webサービスとしても利用可能
- **自動実行**: cronジョブやクラウドスケジューラーによる定期実行に対応

このシステムにより、チームみらいに関する誤情報の拡散を早期に発見し、適切な対応を取ることができます。

---

## セットアップ

To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

# Fact-Check CLI クイックスタートガイド

以下の 4 ステップでセットアップし、ファクトチェックを実行できます。

---

## 1. OpenAI API キーを設定する

プロジェクトルートの `.env` ファイルに API キーを追加してください。
```bash
OPENAI_API_KEY="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

---

## 2. ドキュメントをベクターストアへアップロードする

ドキュメントの.mdファイルをpolicy/以下に配置し、以下を実行してください。
```bash
bun run upload
```

実行後、`config/vectorStore.json` が生成（更新）され、**vector store ID** が出力されます。

---

## 3. vector store ID を `.env` に追加する

```bash
VECTOR_STORE_ID="ここにコピーした ID を貼り付ける"
```

## 4. ENV=prod を `.env` に追加する
現時点で、ENVが`prod`もしくは`dev`の場合`openapi`を使う様になっています。
それ以外は`src/lib/fact_checker/data/fact-check-result.json`のモックデータが出力されます。

```bash
ENV=prod
```

---

## 4. ファクトチェックを実行する

```bash
bun run fact-check "ファクトチェックしたい文章"
```

---

これで準備完了です。楽しいファクトチェックを！ 🎉

# x-fact-check 定期実行ガイド

## 1. 環境変数を設定する

```bash
# --- OpenAI -------------------------------------------------
OPENAI_API_KEY="sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"


# --- X(Twitter) OAuth 1.0a User Context (書き込みが必要な場合) ----
X_APP_KEY=""
X_APP_SECRET=""
X_ACCESS_TOKEN=""
X_ACCESS_SECRET=""

# --- Slack --------------------------------------------------
SLACK_BOT_TOKEN="xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX"
SLACK_SIGNING_SECRET="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
SLACK_CHANNEL_ID="C01XXXXXXXXX" # 通知を送りたいチャンネル ID

# -----------------------------------------------------------
VECTOR_STORE_ID=""
CRON_SECRET="" # cronの認証シークレット headerに設定する src/middlewares/verify-cron.tsを参照
ENV=prod
```

## 2. デプロイする
honoなので各自調整しお好きなところにデプロイしてください。
gcpの例
```bash
gcloud builds submit --tag $IMAGE  
gcloud run deploy x-fact-checker \
--image "$IMAGE" \
--region asia-northeast1 \
--allow-unauthenticated \
--set-env-vars="ENV=prod" \
--set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest,\
X_BEARER_TOKEN=X_BEARER_TOKEN:latest,\
VECTOR_STORE_ID=VECTOR_STORE_ID:latest,\
SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,\
SLACK_SIGNING_SECRET=SLACK_SIGNING_SECRET:latest,\
SLACK_CHANNEL_ID=SLACK_CHANNEL_ID:latest,\
X_APP_KEY=X_APP_KEY:latest,\
X_APP_SECRET=X_APP_SECRET:latest,\
X_ACCESS_TOKEN=X_ACCESS_TOKEN:latest,\
X_ACCESS_SECRET=X_ACCESS_SECRET:latest,\
CRON_SECRET=CRON_SECRET:latest"
```
## 3. 定期実行を設定する
gcpの例
```bash
gcloud scheduler jobs create http cron-fetch-tweets \
--location asia-northeast1 \
--schedule "0 9-21 * * *" \
--time-zone "Asia/Tokyo" \
--http-method GET \
--uri "$SERVICE_URL/cron/fetch" \
--update-headers "X-Cron-Secret=$CRON_SECRET"
```

<!-- Test comment for workflow validation -->

## 修正履歴・メモ

### 2025/6/10 GitHub Actions ワークフロー検証
- terraform-deploy.yml の動作検証を実施
- 発見した問題と修正:
  1. **policyサブモジュールエラー修正**
     - 問題: `policy/` ディレクトリがGitサブモジュール（160000モード）として誤登録
     - 症状: GitHub Actions で "fatal: No url found for submodule path 'policy' in .gitmodules" エラー
     - 修正内容: 
       - `git rm --cached policy` でサブモジュールエントリ削除
       - `git add policy/` で通常ディレクトリとして再登録
     - 修正日時: 2025/6/10

## Phase 1: Docker Build 段階的開放手順

### Step 1: GitHub Repository Variables 設定
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/variables/actions

1. **Variables タブを開く**
   - リポジトリ → Settings → Secrets and variables → Actions → Variables タブ

2. **新しい Repository variable を追加**
   - Name: `ENABLE_DOCKER_BUILD`
   - Value: `true`
   - [Add variable] をクリック

### Step 2: GitHub Repository Secrets 設定（テスト用仮値）
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/secrets/actions

1. **Secrets タブを開く**
   - リポジトリ → Settings → Secrets and variables → Actions → Secrets タブ

2. **新しい Repository secret を追加**

**必要なSecrets (現時点では仮の値でOK - テスト用):**

**Secret 1: GCLOUD_SERVICE_KEY**
- Name: `GCLOUD_SERVICE_KEY`
- Value: 
  ```json
  {"type":"service_account","project_id":"dummy-project-id"}
  ```
- [Add secret] をクリック

**Secret 2: PROJECT_ID**
- Name: `PROJECT_ID`
- Value: `dummy-project-id`
- [Add secret] をクリック

### Step 3: テスト実行
1. **小さな変更をコミット・プッシュ**
   - README にテスト用コメント追加など

2. **GitHub Actions 確認**
   - https://github.com/FMs-sugiyama/fact-checker/actions でワークフロー実行を確認

### 期待される結果・チェック項目

#### ✅ 成功パターン
- **validate ジョブ**: ✅ 成功
- **docker-build ジョブ**: ❌ 認証エラーまたはプロジェクト不存在エラーで失敗（予想通り）
- **safety-report ジョブ**: ✅ 成功
- **ログ出力例**:
  ```
  🐳 Dockerイメージビルド開始
  ERROR: (gcloud.auth.activate-service-account) Invalid credentials
  ```

#### ❌ 設定不備パターン
- **docker-build ジョブが実行されない**: Variables設定ミス
- **Secrets参照エラー**: Secrets名のタイポ

#### 確認すべきログ箇所
1. **safety-report ジョブ**で`ENABLE_DOCKER_BUILD: true`が表示される
2. **docker-build ジョブ**が実行開始される（認証エラーで失敗してもOK）
3. **validate ジョブ**は引き続き成功する

**現在の状況**: 仮の認証情報でも docker-build ジョブが起動することを確認するのが目的です。

### ✅ Phase 1 検証結果 (2025/6/10 完了)
- **validate ジョブ**: ✅ 成功
- **docker-build ジョブ**: ✅ 起動し認証エラーで失敗（期待通り）
- **safety-report ジョブ**: ✅ 成功、`ENABLE_DOCKER_BUILD: true` 表示確認

## Phase 2: Terraform Apply 段階的開放手順

### Step 1: GitHub Repository Variables 追加設定
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/variables/actions

1. **新しい Repository variable を追加**
   - Name: `ENABLE_TERRAFORM_APPLY`
   - Value: `true`
   - [Add variable] をクリック

### Step 2: テスト実行
1. **小さな変更をコミット・プッシュ**
   - README にテスト用コメント追加など

2. **GitHub Actions 確認**
   - https://github.com/FMs-sugiyama/fact-checker/actions でワークフロー実行を確認

### 期待される結果・チェック項目

#### ✅ 成功パターン
- **validate ジョブ**: ✅ 成功
- **docker-build ジョブ**: ❌ 認証エラーで失敗（Phase 1と同様）
- **terraform-apply ジョブ**: ❌ 認証エラーまたはTerraform関連エラーで失敗（予想通り）
- **safety-report ジョブ**: ✅ 成功

#### 期待されるログ出力例
```
🚀 Terraform Apply実行開始
Environment: staging
App Name: x-fact-checker-staging
ERROR: (gcloud.auth.activate-service-account) Invalid credentials
```

#### 確認すべきログ箇所
1. **safety-report ジョブ**で以下が表示される:
   - `ENABLE_DOCKER_BUILD: true`
   - `ENABLE_TERRAFORM_APPLY: true`
   - `✅ Phase 2 (Docker Build): true`
   - `✅ Phase 3 (Terraform Apply): true`
2. **terraform-apply ジョブ**が実行開始される（認証エラーで失敗してもOK）
3. **validate, docker-build ジョブ**は引き続き同様の結果

**現在の状況**: terraform-apply ジョブが起動することを確認するのが目的です。

## Option 2: 実際のGCP認証情報でのフルテスト

### 事前準備: 必要なGCPリソースの作成

#### 1. GCPプロジェクトの確認

**🖥️ GCP Console での操作:**
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 画面上部のプロジェクト選択ドロップダウンで現在のプロジェクトを確認
3. プロジェクトIDをメモしておく

**💻 コマンドライン (参考):**
```bash
# 現在のプロジェクトIDを確認
gcloud config get-value project

# または、プロジェクト一覧を表示
gcloud projects list
```

#### 2. 必要なAPIの有効化

**🖥️ GCP Console での操作:**
1. [APIs & Services > ライブラリ](https://console.cloud.google.com/apis/library) にアクセス
2. 以下のAPIを検索して有効化（**必須**）:
   - **Cloud Build API**: `Cloud Build API` で検索 → [有効にする] ⚠️ **最重要**
   - **Cloud Run API**: `Cloud Run Admin API` で検索 → [有効にする]
   - **Artifact Registry API**: `Artifact Registry API` で検索 → [有効にする]
   - **Cloud Scheduler API**: `Cloud Scheduler API` で検索 → [有効にする]
   - **Secret Manager API**: `Secret Manager API` で検索 → [有効にする] ⚠️ **重要**

**📋 API有効化の確認方法:**
- [APIs & Services > 有効なAPI](https://console.cloud.google.com/apis/dashboard) で一覧確認
- 上記4つのAPIが「有効」になっていることを確認

**💻 コマンドライン (参考):**
```bash
# 必要なAPIを有効化
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

#### 3. Artifact Registryリポジトリの作成

**🖥️ GCP Console での操作:**
1. [Artifact Registry](https://console.cloud.google.com/artifacts) にアクセス
2. [リポジトリを作成] をクリック
3. 以下を設定:
   - **名前**: `fact-checker-repo`
   - **形式**: `Docker`
   - **モード**: `標準`
   - **ロケーション**: `asia-northeast1`
   - **説明**: `Docker repository for fact-checker app`
4. [作成] をクリック

**💻 コマンドライン (参考):**
```bash
# リポジトリ作成
gcloud artifacts repositories create fact-checker-repo \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Docker repository for fact-checker app"

# 作成確認
gcloud artifacts repositories list --location=asia-northeast1
```

#### 4. サービスアカウントの作成と権限設定

**📖 サービスアカウントとは？**
サービスアカウントは、**アプリケーションやサービス専用のGoogleアカウント**です。

- **人間のアカウント** vs **サービスアカウント**:
  - 人間: あなたの gmail.com アカウントでGCPにログイン
  - サービス: GitHub ActionsがGCPのリソースにアクセスするための専用アカウント

- **なぜ必要？**
  - GitHub ActionsからGCPのサービス（Cloud Build、Cloud Runなど）を使用するため
  - あなたの個人アカウントを直接使わず、必要最小限の権限だけを持つ専用アカウントを作成
  - セキュリティ上の理由：万が一キーが漏洩しても、限定された操作しかできない

- **イメージ**:
  ```
  GitHub Actions → サービスアカウント → GCPリソース
                   (github-actions-sa)   (Cloud Build, Cloud Runなど)
  ```

**🖥️ GCP Console での操作:**

**Step 4-1: サービスアカウント作成**
1. [IAM と管理 > サービス アカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) にアクセス
2. **「このページを表示するには、プロジェクトを選択してください。」**と表示される場合:
   - 画面上部のプロジェクト選択ドロップダウンをクリック
   - あなたのGCPプロジェクトを選択（手順1で確認したプロジェクトID）
   - プロジェクトが選択されるとサービスアカウント一覧画面が表示される
3. [サービス アカウントを作成] をクリック
4. **サービス アカウントの詳細**を設定:
   - **サービス アカウント名**: `github-actions-sa`
   - **サービス アカウント ID**: `github-actions-sa` (自動入力)
   - **説明**: `Service account for GitHub Actions`
5. [作成して続行] をクリック

**Step 4-2: 権限の付与（本番環境対応）**
6. 以下のロールを追加（**最小権限**）:
   - `Cloud Build 編集者` (roles/cloudbuild.builds.editor)
   - `Cloud Run 管理者` (roles/run.admin)
   - `Artifact Registry 書き込み` (roles/artifactregistry.writer)
   - `Secret Manager 管理者` (roles/secretmanager.admin)
   - `Service Usage ユーザー` (roles/serviceusage.serviceUsageConsumer)
   - `Storage オブジェクト管理者` (roles/storage.objectAdmin)
   - `サービス アカウント ユーザー` (roles/iam.serviceAccountUser)
   - `Cloud Scheduler 管理者` (roles/cloudscheduler.admin)
   - `IAM Security 管理者` (roles/iam.securityAdmin) - Secret Manager IAM設定のため ⚠️ **追加**
7. [続行] → [完了] をクリック

**💡 権限について:**
- **本番環境対応**: 必要最小限の個別権限のみ付与
- 各権限は特定の操作に必要な最小権限
- `編集者`ロールより安全性が高い

**🔧 本番環境用の個別権限（参考）:**
```
- Cloud Build 編集者 (roles/cloudbuild.builds.editor)
- Cloud Run 管理者 (roles/run.admin)
- Artifact Registry 書き込み (roles/artifactregistry.writer)
- サービス アカウント ユーザー (roles/iam.serviceAccountUser)
- Service Usage ユーザー (roles/serviceusage.serviceUsageConsumer)
- Storage オブジェクト管理者 (roles/storage.objectAdmin)
```
※ 環境によっては追加の権限や組織ポリシーの調整が必要
- 必要以上の権限は与えない（セキュリティの原則）

**💻 コマンドライン (参考):**
```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions-sa \
  --description="Service account for GitHub Actions" \
  --display-name="GitHub Actions SA"

# 必要な権限を付与
PROJECT_ID=$(gcloud config get-value project)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

#### 5. サービスアカウントキーの作成とダウンロード

**📖 サービスアカウントキーとは？**
- サービスアカウントの「パスワード」のようなもの
- JSON形式のファイルで、このキーがあればそのサービスアカウントとしてGCPにアクセス可能
- **非常に重要な機密情報**：このファイルを持つ人は、そのサービスアカウントの権限でGCPを操作できる

**🖥️ GCP Console での操作:**
1. [IAM と管理 > サービス アカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) にアクセス
2. 作成した `github-actions-sa` をクリック
3. [キー] タブをクリック
4. [鍵を追加] → [新しい鍵を作成] をクリック
5. **キーのタイプ**: `JSON` を選択
6. [作成] をクリック
7. JSONファイルが自動でダウンロードされる（ファイル名は `プロジェクト名-xxxxx.json` のような形式）
8. ダウンロードしたファイルをテキストエディタで開き、**全内容**をコピー

**💻 コマンドライン (参考):**
```bash
# キーファイル作成
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com

# 作成されたファイルの内容を確認
cat github-actions-key.json
```

### GitHub Secrets 更新手順

#### 1. GCLOUD_SERVICE_KEY の更新
**実施場所**: https://github.com/FMs-sugiyama/fact-checker/settings/secrets/actions

1. **既存のGCLOUD_SERVICE_KEYを削除**
   - 既存のダミー値を削除

2. **新しいGCLOUD_SERVICE_KEYを追加**
   - Name: `GCLOUD_SERVICE_KEY`
   - Value: `github-actions-key.json` ファイルの**全内容**をコピー&ペースト
   - [Update secret] をクリック

#### 2. PROJECT_ID の更新
1. **既存のPROJECT_IDを削除**
   - 既存のダミー値を削除

2. **新しいPROJECT_IDを追加**
   - Name: `PROJECT_ID`
   - Value: あなたの実際のGCPプロジェクトID
   - 確認方法: `gcloud config get-value project`
   - [Update secret] をクリック

### セキュリティ注意事項
⚠️ **重要**: 
- `github-actions-key.json` ファイルは機密情報です
- GitHub Secretsに設定後、ローカルファイルは削除してください:
  ```bash
  rm github-actions-key.json
  ```

### テスト実行
設定完了後、小さな変更をcommit/pushして、全ジョブが正常に動作することを確認します。

**期待される結果:**
- `validate`: ✅ 成功
- `docker-build`: ✅ 成功（イメージがビルドされる）
- `terraform-apply`: ✅ 成功または部分的成功（Terraformリソースが作成される）
- `safety-report`: ✅ 成功

<!-- Phase 1 test trigger comment -->
<!-- Phase 1 Docker Build test - ENABLE_DOCKER_BUILD=true設定後のテスト -->
<!-- Phase 2 Terraform Apply test - ENABLE_TERRAFORM_APPLY=true設定後のテスト -->
<!-- Full GCP test with real credentials -->
<!-- Retry after fixing storage permissions -->
<!-- Fixed: Cloud Build 閲覧者 → 編集者 に修正後のテスト -->
<!-- Added Service Usage ユーザー + Storage 管理者 権限追加後のテスト -->
<!-- Complete permissions test: 全6つの権限設定完了後のテスト -->
<!-- Final test: 編集者ロール追加後の最終テスト -->
<!-- API enabled: Cloud Build API有効化後の最終テスト -->
<!-- Secret Manager setup: API有効化＋権限追加後のテスト -->
<!-- Security Admin: セキュリティ管理者権限追加後のテスト -->
<!-- Local State Backend: Resource cleanup fallback solution test -->

## ✅ Remote State Backend設定完了
Terraformの冪等性確保のため、Google Cloud StorageをRemote State Backendとして設定済み。
- 自動的にTerraform State用のGCSバケットを作成
- CI/CD環境での状態管理を確保
- チーム開発での状態共有が可能

## 🔧 Secret Manager権限不足エラーの解決

**現在のエラー**: `Permission 'secretmanager.secrets.setIamPolicy' denied`

**適切な権限追加**:
1. [IAM と管理 > サービス アカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) にアクセス
2. `github-actions-sa` をクリック
3. **セキュリティ管理者** (roles/iam.securityAdmin) ロールを追加 ✅ **設定完了**

**このロールの権限範囲**:
- IAMポリシーの設定・変更
- Secret Manager IAM設定
- 最小権限の原則に適合

## TODO: 本番環境向け権限見直し
- [ ] github-actions-sa から編集者ロールを削除
- [ ] 必要最小限の個別権限（8つ）に変更
- [ ] セキュリティレビュー実施
- [ ] オーナー権限を削除（テスト完了後）
- [ ] **Secret Manager 値設定** (Cloud Run起動に必須)

## 🔐 Secret Manager 値設定手順

**現在の状況**: Terraformで Secret Manager の枠組みは作成済み、値は未設定

### gcloud CLI 初期設定 (コマンドライン使用前に必須)

**📦 gcloud CLI インストール:**
```bash
# macOS (Homebrew使用)
brew install --cask google-cloud-sdk

# または公式インストーラー
curl https://sdk.cloud.google.com | bash
```

**🔐 認証とプロジェクト設定:**
```bash
# 1. Google アカウントでログイン (ブラウザが開きます)
gcloud auth login

# 2. プロジェクトIDを設定 (あなたのGCPプロジェクトIDに置換)
gcloud config set project YOUR_PROJECT_ID

# 3. デフォルトリージョンを設定
gcloud config set compute/region asia-northeast1
gcloud config set compute/zone asia-northeast1-a

# 4. 設定確認
gcloud config list
```

**📋 設定確認コマンド (各コマンドを個別に実行):**
```bash
# 設定一覧表示
gcloud config list

# プロジェクトID確認
gcloud config get-value project

# 認証状況確認  
gcloud auth list

# アカウント情報確認
gcloud info
```

### Secret値設定方法

**🖥️ GCP Console での操作:**
1. [Secret Manager](https://console.cloud.google.com/security/secret-manager) にアクセス
2. 設定したいSecretをクリック（例: `staging-openai-api-key`）
3. [新しいバージョン] をクリック
4. **シークレットの値**にダミー値を入力（例: `dummy-openai-key`）
5. [バージョンを作成] をクリック
6. 他のSecretについても同様に設定

**必要なSecret一覧 (staging環境):**
- `staging-openai-api-key` → `dummy-openai-key`
- `staging-vector-store-id` → `dummy-vector-store`
- `staging-slack-bot-token` → `dummy-slack-token`
- `staging-slack-signing-secret` → `dummy-slack-secret`
- `staging-slack-channel-id` → `dummy-channel-id`
- `staging-x-app-key` → `dummy-x-key`
- `staging-x-app-secret` → `dummy-x-secret`
- `staging-x-access-token` → `dummy-x-token`
- `staging-x-access-secret` → `dummy-x-access`
- `staging-x-bearer-token` → `dummy-x-bearer`
- `staging-cron-secret` → `dummy-cron-secret`

**💻 Secret値設定コマンド (staging環境の例):**
```bash
# OpenAI設定 (ダミー値でも起動可能)
echo "dummy-openai-key" | gcloud secrets versions add staging-openai-api-key --data-file=-
echo "dummy-vector-store" | gcloud secrets versions add staging-vector-store-id --data-file=-

# Slack設定 (ダミー値でも起動可能)
echo "dummy-slack-token" | gcloud secrets versions add staging-slack-bot-token --data-file=-
echo "dummy-slack-secret" | gcloud secrets versions add staging-slack-signing-secret --data-file=-
echo "dummy-channel-id" | gcloud secrets versions add staging-slack-channel-id --data-file=-

# Twitter/X API設定 (ダミー値でも起動可能)
echo "dummy-x-key" | gcloud secrets versions add staging-x-app-key --data-file=-
echo "dummy-x-secret" | gcloud secrets versions add staging-x-app-secret --data-file=-
echo "dummy-x-token" | gcloud secrets versions add staging-x-access-token --data-file=-
echo "dummy-x-access" | gcloud secrets versions add staging-x-access-secret --data-file=-
echo "dummy-x-bearer" | gcloud secrets versions add staging-x-bearer-token --data-file=-

# Cron認証設定
echo "dummy-cron-secret" | gcloud secrets versions add staging-cron-secret --data-file=-
```

**📋 設定確認:**
```bash
# 設定されたSecret一覧表示
gcloud secrets list --filter="name:staging-*"

# 特定のSecretのバージョン確認
gcloud secrets versions list staging-openai-api-key
```

**💡 重要事項:**
- **ダミー値でもCloud Run起動は成功**する
- **実際の機能使用には正しいAPI key**が必要
- 本番環境では `staging-` を `production-` に変更

## Cloud Run Configuration Updates
- Added ENV environment variable support for fact-checker provider selection
- Configured automatic ENV setting based on branch (prod/dev)
- Fixed startup probe failures caused by missing environment configuration


