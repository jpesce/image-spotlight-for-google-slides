# This makefile is used to
# - Create a release in Github
# - Build zip builds for distribution in the Chrome Web Store
# - Manage version number in manifest

PROJECT = image-spotlight-for-google-slides
MANIFEST = manifest.json
BUILD_DIR = build
VERSION = $(shell jq -r '.version' $(MANIFEST))
TAG = v$(VERSION)
ZIPNAME = $(BUILD_DIR)/$(PROJECT)-$(TAG).zip

# @help: Show this help message
.PHONY: help
help:
	@echo "\n📋 Available commands:\n"
	@grep -E '^# @[a-zA-Z_-]+:' $(MAKEFILE_LIST) | sed 's/^# @//' | awk -F: '{printf "\033[34m%-12s\033[0m %s\n", $$1, $$2}'

# @all: Main release workflow - builds package, creates and pushes git tag and creates GitHub release
.PHONY: all
all: ensure-main ensure-clean ensure-pushed \
	build tag push-tag release


# @build: Builds a zip package for current version
.PHONY: build
build: require-zip
	@mkdir -p $(BUILD_DIR)
	@echo "\n📦 Building release package for $(TAG)…\n"
	@rm -f $(ZIPNAME)
	@zip -r "$(ZIPNAME)" . \
		-x "$(BUILD_DIR)/*" \
		-x "supporting-material/*" \
		-x "README.md" \
		-x "*.git*" \
		-x "*.DS_Store"
	@echo "\n✨ Release package \033[34m$(ZIPNAME)\033[0m created successfully"

$(ZIPNAME): build


# @clean: Removes all built packages
.PHONY: clean
clean:
	@echo "\n🧹 Cleaning build directory \033[34m${BUILD_DIR}\033[0m"
	@rm -rf $(BUILD_DIR)


# @bump: Updates version number in manifest
.PHONY: bump
bump: require-jq
	@echo "\n⬆️ Bumping version $(VERSION)\n";
	@IFS=. read -r major minor patch <<< "$(VERSION)"; \
	while true; do \
		read -p "Bump (M)ajor, (m)inor, (p)atch, or (a)bort? " answer; \
		if [ "$$answer" = "M" ]; then \
			new_version="$$((major+1)).0.0"; \
			break; \
		elif [ "$$answer" = "m" ]; then \
			new_version="$$major.$$((minor+1)).0"; \
			break; \
		elif [ "$$answer" = "p" ]; then \
			new_version="$$major.$$minor.$$((patch+1))"; \
			break; \
		elif [ "$$answer" = "a" ]; then \
			echo "Version bump aborted."; \
			exit 130; \
		else \
			echo "Invalid option. Please try again."; \
		fi \
	done; \
	jq '.version="'"$$new_version"'"' $(MANIFEST) > $(MANIFEST).tmp && mv $(MANIFEST).tmp $(MANIFEST); \
	echo "\n✨ Version bumped to $$new_version"


# @tag: Creates version tag in local repository
.PHONY: tag
tag:
	@# Check if tag already exists
	@if git rev-parse $(TAG) >/dev/null 2>&1; then \
		echo "\n❌ Tag \033[34m$(TAG)\033[0m already exists."; \
		echo "If this is a new version, please run 'make bump' first to increment the version number.\n"; \
		exit 1; \
	fi

	@git tag -a $(TAG) -e -F .gittagtemplate
	@echo "\n✨ Tag $(TAG) created successfully"


# @push-tag: Pushes version tag to remote repository
.PHONY: push-tag
push-tag: 
	@echo "\n⬆️ Pushing tag to remote repository..."
	@git push origin tag $(TAG)
	@echo "\n✨ Tag pushed successfully"


# @release: Creates GitHub release using the git tag message as base for release notes
.PHONY: release
release: require-gh ensure-tag $(ZIPNAME)
	@echo "\n🚀 Creating GitHub release for \033[34m$(TAG)\033[0m..."
	
	@# Add a preamble note informing about the recommended installation method via Chrome Web Store
	@cat .githubreleasepreamble > .releasenotes.tmp

	@# Format tag note as markdown (first line heading, and changes is third heading)
	@git tag -l --format='%(contents)' $(TAG) | sed -e '1s/^/## /' -e 's/^Changes:/### Changes:/' >> .releasenotes.tmp

	@gh release create $(TAG) --title "$(TAG)" --notes-file .releasenotes.tmp "$(ZIPNAME)"
	@rm .releasenotes.tmp
	@echo "\n✨ Release created and package uploaded successfully"


.PHONY: require-jq
require-jq:
	@command -v jq >/dev/null 2>&1 || { echo "\n❌ \033[31mjq\033[0m is required but not installed. Please install it first."; exit 1; }

.PHONY: require-zip
require-zip:
	@command -v zip >/dev/null 2>&1 || { echo "\n❌ \033[31mzip\033[0m is required but not installed. Please install it first."; exit 1; }

.PHONY: require-gh
require-gh:
	@command -v gh >/dev/null 2>&1 || { echo "\n❌ \033[31mgh\033[0m (GitHub CLI) is required but not installed. Please install it first."; exit 1; }

.PHONY: ensure-tag
ensure-tag:
	@if ! git rev-parse $(TAG) >/dev/null 2>&1; then \
		echo "\n❌️ Tag \033[34m$(TAG)\033[0m does not exist. Create it first with `make tag`"; \
		exit 1; \
	fi

.PHONY: ensure-main
ensure-main:
	@if [ "$$(git branch --show-current)" != "main" ]; then \
		echo "\n❌ You must be on the \033[34mmain\033[0m branch to create a release."; \
		echo "Please switch to the main branch first.\n"; \
		exit 1; \
	fi

.PHONY: ensure-clean
ensure-clean:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "\n❌ Git working directory is not clean."; \
		echo "Please commit or stash your changes first.\n"; \
		exit 1; \
	fi

.PHONY: ensure-pushed
ensure-pushed:
	@if [ -n "$$(git rev-list @{upstream}..HEAD 2>/dev/null)" ]; then \
		echo "\n❌ You have unpushed commits."; \
		echo "Please push your changes first or move them to another branch.\n"; \
		exit 1; \
	fi
