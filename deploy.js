const { pour } = require('pour-console');
const fs = require('fs');

async function deploy (
  callback,
  deployFolder = 'dist',
  deployBranch = 'heroku',
  deployMessage = 'Deploy to Heroku'
) {
  // Ensure that dist folder doesn't exist in the first place
  await pour('rm -rf dist')

  try {
    await pour(`git branch ${deployBranch} master`)
  } catch (e) {
    console.error(e)
  }

  await pour(`git worktree add -f ${deployFolder} ${deployBranch}`)

  await callback(deployFolder, deployBranch)

  await pour('git add .', {
    cwd: deployFolder
  })

  await pour([
    'git',
    'commit',
    '-m',
    deployMessage
  ], {
    cwd: deployFolder
  })

  await pour(`git push -f heroku ${deployBranch}:master`, {
    cwd: deployFolder
  })

  await pour(`git worktree remove ${deployFolder}`)

  await pour(`git branch -D ${deployBranch}`)
}

deploy(async (deployFolder) => {


  /*fs.mkdir(`${deployFolder}/data`, function(err) {
    if (err) {
      console.log(err)
    } else {
      console.log("New directory successfully created.")
    }
  });*/
  fs.writeFileSync(
    `${deployFolder}/.gitignore`,
    fs.readFileSync('.gitignore', 'utf8').replace('data/staff.json', '').replace('data/courses.json', '').replace('.env', '')
  )
  fs.copyFileSync(
    'data/staff.json',
    `${deployFolder}/${'data/staff.json'}`
  );
  fs.copyFileSync(
    'data/courses.json',
    `${deployFolder}/${'data/courses.json'}`
  )
  fs.copyFileSync(
    '.env',
    `${deployFolder}/${'.env'}`
  );

}).catch(console.error)