# Makefile for building the site locally

CV_SOURCE = cv.md
CV_OUTPUT = assets/cv.pdf

# Generate CV PDF from markdown using pandoc
cv: $(CV_SOURCE)
	pandoc $(CV_SOURCE) -so $(CV_OUTPUT)

# Build the Jekyll site
build: cv
	bundle exec jekyll build

# Serve locally
serve:
	bundle exec jekyll serve

# Clean all generated files
clean:
	rm -rf _site .jekyll-cache .sass-cache
	rm -f assets/cv.pdf

# Full rebuild
rebuild: clean build

.PHONY: cv build serve clean rebuild