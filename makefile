# This makefile is used to build releases of the extension.
# It handles version management and creates zip files for distribution.
# Requires `jq` and `zip`

# Variables
REPO_NAME = image-spotlight-for-google-slides
MANIFEST = manifest.json
BUILD_DIR = releases

# Function to get and validate version from manifest.json
define get_version
	current_version=$$(jq -r '.version' $(MANIFEST)); \
	if ! echo "$$current_version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$$'; then \
		echo "❌ Invalid version format in $(MANIFEST). Expected format: X.Y.Z, found: '$$current_version'" >&2; \
		exit 2; \
	fi; \
	echo "$$current_version"
endef

.PHONY: all build bump

all: build

build:
	@mkdir -p $(BUILD_DIR)
	@version=$$($(call get_version)) || exit 2; \
	zipname="$(BUILD_DIR)/$(REPO_NAME)-v$$version.zip"; \
	while [ -f "$$zipname" ]; do \
		echo "\n⚒️ Building the release... current version: $$version\n"; \
		echo "Build file $$zipname already exists."; \
		while true; do \
			read -p "Choose (o)verwrite, (b)ump version, or (a)bort? " answer; \
			if [ "$$answer" = "o" ]; then \
				rm "$$zipname"; \
				break; \
			elif [ "$$answer" = "b" ]; then \
				$(MAKE) bump; \
				version=$$($(call get_version)) || exit 2; \
				zipname="$(BUILD_DIR)/$(REPO_NAME)-v$$version.zip"; \
				break; \
			elif [ "$$answer" = "a" ]; then \
				echo "Aborted."; \
				exit 130; \
			else \
				echo "Invalid option. Please try again."; \
			fi \
		done \
	done; \
	echo "\nCreating $$zipname"; \
	zip -r "$$zipname" . \
		-x "$(BUILD_DIR)/*" \
		-x "supporting-material/*" \
		-x "README.md" \
		-x "*.git*" \
		-x "*.DS_Store" \
	echo "\n✅ Created $$zipname"

bump:
	@version=$$($(call get_version)) || exit 2; \
	IFS=. read -r major minor patch <<< "$$version"; \
	echo "\n⬆️ Bumping version... current version: $$version\n"; \
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
			echo "Aborted."; \
			exit 130; \
		else \
			echo "Invalid option. Please try again."; \
		fi \
	done; \
	jq '.version="'"$$new_version"'"' $(MANIFEST) > $(MANIFEST).tmp && mv $(MANIFEST).tmp $(MANIFEST); \
	echo "\n✅ Bumped version to $$new_version"
