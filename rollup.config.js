import { builtinModules } from 'module'
import swc from '@rollup/plugin-swc'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import dts from 'rollup-plugin-dts'
import pkg from './package.json' assert { type: 'json' }

const external =  Object.keys(pkg.dependencies || {})
        .concat(Object.keys(pkg.peerDependencies || {}))
    .concat(builtinModules).filter(item => item !== 'log4js');

/** @type {import('rollup').RollupOptions} */
export default [{
    input: './.build/index.js',
    output: [
        { file: pkg.exports.import, format: 'es' },
        { file: pkg.exports.require, format: 'commonjs' },
    ],
    external,
    plugins: [
        nodeResolve(),
        swc({
            include: ['src/**/*.ts'],
            jsc: {
                parser: {
                    syntax: "typescript",
                    tsx: false
                }
            }
        }),
        commonjs(),
    ]
}, {
    input: './.build/index.d.ts',
    output: [{ file: pkg.types, format: 'es' }],
    external,
    plugins: [dts()]
}]
