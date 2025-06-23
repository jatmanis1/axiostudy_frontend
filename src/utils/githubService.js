
class GitHubService {
    constructor() {
        this.token = "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" // Use environment variable
        this.owner = 'jatmanis1'
        this.repo = 'axiostudy'
        this.branch = 'main'
        this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents`
    }

    // Convert frontend title to GitHub filename format
    frontendTitleToGitHubFilename(frontendTitle) {
        return frontendTitle
            .toLowerCase()                                    // Convert to lowercase first
            .split(' ')                                       // Split by spaces
            .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
            .join('_')                                        // Join with underscores
            .replace(/#/g, '%23')                            // Replace # with %23
            + '.pdf'                                         // Add .pdf extension
    }

    // Convert GitHub filename to frontend title format
    gitHubFilenameToFrontendTitle(githubFilename) {
        return githubFilename
            .replace('.pdf', '')                             // Remove .pdf extension
            .replace(/%23/g, '#')                            // Replace %23 with #
            .replace(/_/g, ' ')                              // Replace underscores with spaces
            .toLowerCase()                                   // Convert to lowercase
    }

    // Encode title for URL (frontend route parameter)
    encodeForUrl(title) {
        return encodeURIComponent(title)
    }

    // Decode title from URL parameter
    decodeFromUrl(encodedTitle) {
        return decodeURIComponent(encodedTitle)
    }

    // Get GitHub path from frontend encoded title
    getGitHubPathFromEncodedTitle(encodedTitle) {
        const frontendTitle = this.decodeFromUrl(encodedTitle)
        const githubFilename = this.frontendTitleToGitHubFilename(frontendTitle)
        return `media/${githubFilename}`
    }

    // Fetch PDF list and create proper mappings
    async fetchPDFList() {
        try {
            const url = `${this.baseUrl}/media`

            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Vue-PDF-Viewer/1.0'
                }
            })

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`)
            }

            const files = await response.json()

            return files
                .filter(file => file.type === 'file' && file.name.toLowerCase().endsWith('.pdf'))
                .map((file, index) => {
                    const frontendTitle = this.gitHubFilenameToFrontendTitle(file.name)
                    const encodedTitle = this.encodeForUrl(frontendTitle)

                    return {
                        id: index + 1,
                        title: frontendTitle,
                        displayTitle: this.formatDisplayTitle(frontendTitle),
                        filename: file.name,
                        encodedTitle: encodedTitle,
                        githubPath: `media/${file.name}`,
                        size: file.size,
                        downloadUrl: file.download_url,
                        course: this.extractCourse(frontendTitle),
                        subject: this.extractSubject(frontendTitle),
                        unit: this.extractUnit(frontendTitle),
                    }
                })

        } catch (error) {
            console.error('Error fetching PDF list:', error)
            throw error
        }
    }

    // Fetch PDF content using encoded title
    async fetchPDFContent(encodedTitle) {
        try {
            const githubPath = this.getGitHubPathFromEncodedTitle(encodedTitle)
            const url = `${this.baseUrl}/${encodeURIComponent(githubPath)}`

            console.log('Fetching PDF:', {
                encodedTitle,
                decodedTitle: this.decodeFromUrl(encodedTitle),
                githubPath,
                url
            })

            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3.raw',
                    'User-Agent': 'Vue-PDF-Viewer/1.0'
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
            }

            return await response.blob()

        } catch (error) {
            console.error('Error fetching PDF content:', error)
            throw error
        }
    }

    // Format display title for better readability
    formatDisplayTitle(title) {
        return title
            .split('#')
            .map(part => part.trim())
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' → ')
    }

    // Extract metadata from title
    extractCourse(title) {
        const lowerTitle = title.toLowerCase()
        if (lowerTitle.includes('bsc')) return 'BSc'
        if (lowerTitle.includes('msc')) return 'MSc'
        if (lowerTitle.includes('ba')) return 'BA'
        if (lowerTitle.includes('ma')) return 'MA'
        return 'General'
    }

    extractSubject(title) {
        const lowerTitle = title.toLowerCase()
        if (lowerTitle.includes('chemistry')) return 'Chemistry'
        if (lowerTitle.includes('physics')) return 'Physics'
        if (lowerTitle.includes('mathematics')) return 'Mathematics'
        if (lowerTitle.includes('biology')) return 'Biology'
        return 'Study Material'
    }

    extractUnit(title) {
        const match = title.match(/unit\s+(\d+(?:st|nd|rd|th)?)/i)
        return match ? match[1] : 'N/A'
    }
}

export const githubService = new GitHubService()
