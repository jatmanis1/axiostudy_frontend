import { githubService } from './utils/githubService.js'

// Test cases
const testCases = [
    {
        frontendTitle: 'bsc final year# physical chemistry# unit 1st elementary quantum',
        expectedGitHubFilename: 'Bsc_Final_Year%23_Physical_Chemistry%23_Unit_1st_Elementary_Quantum.pdf'
    },
    {
        frontendTitle: 'msc first year# organic chemistry# unit 2nd reactions',
        expectedGitHubFilename: 'Msc_First_Year%23_Organic_Chemistry%23_Unit_2nd_Reactions.pdf'
    }
]

console.log('Testing title mapping functions...\n')

testCases.forEach((testCase, index) => {
    console.log(`Test Case ${index + 1}:`)
    console.log('Frontend Title:', testCase.frontendTitle)

    const generatedFilename = githubService.frontendTitleToGitHubFilename(testCase.frontendTitle)
    console.log('Generated GitHub Filename:', generatedFilename)
    console.log('Expected GitHub Filename:', testCase.expectedGitHubFilename)
    console.log('Match:', generatedFilename === testCase.expectedGitHubFilename ? '✅' : '❌')

    // Test reverse mapping
    const backToFrontend = githubService.gitHubFilenameToFrontendTitle(generatedFilename)
    console.log('Back to Frontend:', backToFrontend)
    console.log('Round-trip Match:', backToFrontend === testCase.frontendTitle ? '✅' : '❌')

    console.log('---\n')
})
