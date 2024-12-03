var {readFileSync}=require('fs')
const { basename } = require('path')


const disabled=mem=>{
    console.error(`DISABLED OPCODE ${mem.bytecode[mem.instptr-1]} CALLED! ${mem.label}:${mem.instptr-1}`)
    debugger
}
const xlbcglobal={
    require,
    console,
    process,
    Array,
    Object,
    String,
    JSON,
    Date,
    assert:(b,f,...s)=>b?1:f(...s),
    dinahu:()=>'dinahu'
}
xlbcglobal.global=xlbcglobal
const xg=xlbcglobal
if(!process.pkg)global.xg=xg
"rq сасал"
const opcodes=[
        mem=>mem.stack.push(null),//pushnull
        mem=>mem.stack.push(mem.bytecode.readUint32BE((mem.instptr+=4)-4)),//pushi
        mem=>mem.stack.push(mem.stack.shift()(...mem.stack.splice(0,mem.stack.length))),//calls
        mem=>mem.stack.push(xlbcglobal[mem.stack.pop()]),//pushgl
        mem=>mem.stack.push(mem.strpool[mem.stack.pop()]),//pushp
        mem=>mem.stack.push(mem.vartab[mem.stack.pop()]),//pushvar
        mem=>mem.vartab[mem.stack.pop()]=mem.stack.pop(),//store
        disabled,//delv
        mem=>mem.stack.pop(),//pops
        mem=>{
            const t=mem.stack.pop();
            mem.stack.push(mem.stack.pop()[t])
        },//getp
        mem=>{
            const t=mem.stack.pop()
            mem.stack[mem.stack.length-2][mem.stack.pop()]=t
        },//setp
        mem=>disabled(mem,mem.bytecode.readUint32BE((mem.instptr+=4)-4)),//exit
        mem=>mem.stack.push(new (mem.stack.shift())(...mem.stack.splice(0,mem.stack.length))),//new
        mem=>mem.stack.push(eval(mem.stack.pop())),//invokeJS
        mem=>mem.stack.push(mem.stack.pop()+mem.stack.pop()),//add
        disabled,//sub
        disabled,//mul
        disabled,//div
        disabled,//pow
        mem=>mem.stack.push(mem.stack[mem.stack.length-1]),//dup
        disabled,//printdebug
        disabled,//shift
        disabled,//srev/////
        mem=>disabled(mem,mem.bytecode.readUint16BE((mem.instptr+=2)-2)),//buildstring
        disabled,//pushc
        mem=>mem.stack.push(mem.bytecode.readUint16BE((mem.instptr+=2)-2)),//25 pushs

        mem=>mem.stack.push(mem.bytecode[mem.instptr++]),//pushb
        disabled,//stackl
        disabled,//getip
        mem=>mem.instptr=mem.stack.pop(),//setip
        mem=>mem.instptr=mem.bytecode.readUint16BE((mem.instptr+=2)-2),//jmp
        disabled,//ifej
        mem=>mem.stack.push(true),//pushtrue
        mem=>mem.stack.push(false),//pushfalse
        disabled,//bxor
        disabled,//and
        mem=>{
            const second=mem.stack.pop()
            mem.stack.push(mem.stack.pop()||second)
        },//or
        mem=>mem.stack.push(!mem.stack.pop()),//not
        disabled,//eq
        disabled,//neq
        disabled,//band
        disabled,//mod
        disabled,//xor
        disabled,//inc
        disabled,//dec
        disabled,//codepoint
        disabled,//gotocp
        disabled,//getcp
        disabled,//remcp
        disabled,//jmpo
        disabled,//50 jmpa

        disabled,//gr
        disabled,//le
        disabled,//gre
        disabled,//lee
        disabled,//getmeta
        mem=>mem.stack.push(mem.stack.shift()[mem.stack.shift()](...mem.stack.splice(0,mem.stack.length))),//pcalls
        disabled,//ltf
        disabled,//ftl
        disabled,//fts
        disabled,//sleep
        disabled,//iters
        mem=>{debugger},//nop
        disabled,//pushundefined
        disabled,//pushnan
        ()=>{}//65 await
]


const execute_bytecode=async(mem,from=0,exitAt)=>{
    exitAt=exitAt||mem.bytecode.length
    mem.instptr=from
    try {
        while(mem.instptr<exitAt){
            if(mem.bytecode[mem.instptr]==65)
                mem.stack.push(await mem.stack.pop(mem.instptr++))
            else
            opcodes[mem.bytecode[mem.instptr++]](mem)
        }
    } catch (error) {
        error.stack+=`\nXLBC origin ${mem.label}:${mem.instptr-1}`
        throw error
    }
    return mem.stack
}
const nbcsign=0x4e424631
const nbcesign=0x4e424633
const parse_nbf=async(nbcbuf=new Buffer(),spencryption,label)=>{
    var ofs=0
    if(nbcbuf.readUInt32BE(ofs)!=(spencryption?nbcesign:nbcsign))
        throw new Error("nosign!!")
        var se=spencryption?require('encryption-se')({"password":spencryption,"passwordSalt":spencryption}):null
        delete spencryption
        ofs+=4
    const mem={
        stack:[],
        strpool:[],
        vartab:{},
        instptr:0,
        metadata:{},
        label
    }
    
    while(ofs<nbcbuf.length){
        var sectiontype=nbcbuf.readUint8(ofs++)
        var sectionlen=nbcbuf.readUint16BE(ofs)
        ofs+=2
        var sectionbody=nbcbuf.subarray(ofs,ofs+sectionlen)
        ofs+=sectionlen
        var lofs=0
        switch(sectiontype){
            //strpool
            case 1:{
               while(lofs<sectionbody.length){
                   var strlen=sectionbody.readUint16BE(lofs)
                   lofs+=2
                   var s=sectionbody.subarray(lofs,lofs+strlen).toString('utf-8')
                   
                   mem.strpool.push( await (se?.decrypt(s)||s))
                   lofs+=strlen
                }
                break
            }
            //bytecode
            case 2:{
                mem.bytecode=sectionbody
                break
            }
            //metadata key-value pairs
            case 3:{
                while(lofs<sectionbody.length){
                    var strlen=sectionbody.readUint16BE(lofs)
                    lofs+=2
                    var key=sectionbody.subarray(lofs,lofs+strlen).toString('utf-8')
                    lofs+=strlen
                    strlen=sectionbody.readUint16BE(lofs)
                    lofs+=2
                    var value=sectionbody.subarray(lofs,lofs+strlen).toString('utf-8')
                    lofs+=strlen
                    mem.metadata[key]=value
                 }
                 break

            }
            default:
                break
        }
        delete se
    }
    return mem
}
const runNBF=async(filepath,d,...args)=>{
    const mem=await parse_nbf(readFileSync(filepath),d,basename(filepath))
    delete d
    if(args)args.forEach(v=>mem.stack.push(v))
    return await execute_bytecode(mem);
}
xlbcglobal.importFunction=async(c,f,d)=>{
    const m=await parse_nbf(readFileSync(c.replace('.',__dirname)),d,`${basename(c)}#${f}`)
    delete d
    const ex=JSON.parse(m.metadata["_exports"])
    if(!ex[f])return ()=>{}
    var ea=m.bytecode.readUint16BE(ex[f]-3)
    return async(...a)=>{
        m.stack.splice(0)
        m.stack.push(...a)
        await execute_bytecode(m,ex[f],ea)
        return m.stack.pop()
    }
}

function bufferzone(...args){return runNBF(...args)}
module.exports=bufferzone