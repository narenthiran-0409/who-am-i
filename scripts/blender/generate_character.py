"""Rebuild with Blender 5.2: blender --background --python scripts/blender/generate_character.py.
Original procedural mesh; no image textures, image planes, or external assets.
Coordinates: Z up, face -Y. Right side is -X. Units are metres.
"""
import bpy, math, json, struct
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from math import sin, cos, pi
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models'
REVIEW = ROOT / 'docs/character-review'
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
scene=bpy.context.scene
scene.render.fps=30
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=800; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.world.color=(.22,.22,.22)
scene.view_settings.view_transform='AgX'
M={}
def mat(name,c,rough=.5,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    M[name]=m; return m
mat('Skin • warm peach',(.64,.31,.16),.48)
mat('Ear and lip warmth',(.46,.16,.085))
mat('Hair • chestnut',(.085,.024,.011),.34)
mat('Hair highlights',(.095,.03,.015),.55)
mat('Glasses • espresso',(.022,.012,.009),.3)
mat('Eye whites',(.88,.91,.85),.3)
mat('Iris • hazel',(.10,.16,.13),.3)
mat('Pupils',(.006,.009,.01),.28)
mat('Shirt • powder blue',(.24,.57,.66),.7)
mat('Shirt seams',(.12,.34,.42),.75)
mat('Trousers • brick red',(.44,.045,.024),.8)
mat('Trouser seams',(.25,.024,.016),.8)
mat('Sneakers • slate',(.16,.19,.23),.8)
mat('Sneaker sole and laces',(.85,.84,.76),.65)
mat('Chair • blue upholstery',(.055,.16,.23),.85)
mat('Chair piping',(.11,.27,.34),.8)
mat('Walnut legs',(.19,.061,.026),.55)
mat('Laptop • satin aluminum',(.38,.43,.48),.3,.65)
mat('Keyboard',(.035,.052,.07),.55)
mat('Screen',(.012,.028,.04),.35)
mat('Code • cyan',(.12,.75,.8),.4)
skin=M['Skin • warm peach']; hair=M['Hair • chestnut']; shirt=M['Shirt • powder blue']; red=M['Trousers • brick red']
# One deform rig; props are deliberately unparented and unanimated.
arm=bpy.data.armatures.new('Developer skeleton'); rig=bpy.data.objects.new('Developer_Rig',arm); scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
def bone(n,h,t,parent=None):
    b=arm.edit_bones.new(n); b.head=h; b.tail=t
    if parent: b.parent=arm.edit_bones[parent]
    b.align_roll(Vector((0,0,1)) if abs((Vector(t)-Vector(h)).normalized().z)<.95 else Vector((0,1,0)))
    return b
bone('root',(0,0,.98),(0,0,1.15))
bone('torso',(0,0,1.15),(0,0,2.04),'root')
bone('neck',(0,0,2.04),(0,0,2.24),'torso')
bone('head',(0,0,2.24),(0,0,2.89),'neck')
rests={}
for side,sgn in [('R',-1),('L',1)]:
    sh=Vector((sgn*.40,0,2.00)); el=Vector((sgn*.57,-.17,1.51)); wr=Vector((sgn*.34,-.65,1.56))
    rests[side]=(sh,el,wr)
    bone('upper_arm.'+side,sh,el,'torso'); bone('forearm.'+side,el,wr,'upper_arm.'+side)
    bone('hand.'+side,wr,wr+Vector((0,-.14,0)),'forearm.'+side)
    for i,(label,length) in enumerate([('index',.16),('middle',.18),('ring',.16),('pinky',.125)]):
        p=wr+Vector((sgn*(-.067+i*.043),-.135,0)); q=p+Vector((0,-length*.55,0)); tip=p+Vector((0,-length,0))
        bone(label+'_1.'+side,p,q,'hand.'+side); bone(label+'_2.'+side,q,tip,label+'_1.'+side)
    p=wr+Vector((-sgn*.085,-.05,-.005)); q=p+Vector((-sgn*.05,-.058,-.015)); tip=q+Vector((-sgn*.02,-.057,-.012))
    bone('thumb_1.'+side,p,q,'hand.'+side); bone('thumb_2.'+side,q,tip,'thumb_1.'+side)
    hip=(sgn*.24,0,1.17); knee=(sgn*.26,-.75,1.03); ankle=(sgn*.27,-.85,.25)
    bone('thigh.'+side,hip,knee,'root'); bone('shin.'+side,knee,ankle,'thigh.'+side); bone('foot.'+side,ankle,(sgn*.27,-1.12,.17),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT'); rig.select_set(False)
def finish(o,name,material,weights=None):
    o.name=name; o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth=True
    if weights:
        if isinstance(weights,str): weights=[{weights:1} for v in o.data.vertices]
        groups={n:o.vertex_groups.new(name=n) for n in {n for w in weights for n in w}}
        for i,w in enumerate(weights):
            for n,v in w.items():
                if v>0: groups[n].add([i],v,'REPLACE')
        mod=o.modifiers.new('Skin weights','ARMATURE'); mod.object=rig; o.parent=rig
    return o
def mesh(name,verts,faces,material,weights=None):
    d=bpy.data.meshes.new(name); d.from_pydata(verts,[],faces); d.update(); o=bpy.data.objects.new(name,d); scene.collection.objects.link(o); return finish(o,name,material,weights)
def uv(name,loc,scale,material,b=None,seg=24,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc); o=bpy.context.object; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,material,b)
def box(name,loc,scale,material,bevel=.04,b=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Rounded tailored edges','BEVEL'); mod.width=bevel; mod.segments=3
    bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,material,b)
def tube(name,points,radii,material,b=None,sides=12,weights=None):
    pts=[Vector(p) for p in points]; verts=[]; faces=[]; ws=[]; previous_u=None
    for i,p in enumerate(pts):
        axis=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized(); ref=Vector((0,0,1))
        if abs(axis.dot(ref))>.92: ref=Vector((0,1,0))
        u=(previous_u-axis*previous_u.dot(axis)).normalized() if previous_u is not None else axis.cross(ref).normalized(); previous_u=u.copy(); v=axis.cross(u).normalized(); r=radii[i] if isinstance(radii,list) else radii
        rx,ry=r if isinstance(r,tuple) else (r,r)
        for j in range(sides):
            verts.append(p+u*cos(j*2*pi/sides)*rx+v*sin(j*2*pi/sides)*ry)
            if weights: ws.append(weights[i])
        if i:
            for j in range(sides): a=(i-1)*sides+j; c=(i-1)*sides+(j+1)%sides; faces.append((a,c,c+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))])
    o=mesh(name,verts,faces,material,ws if weights else b)
    sub=o.modifiers.new('Smooth contours','SUBSURF'); sub.levels=1
    bpy.context.view_layer.objects.active=o
    if o.modifiers.find(sub.name)>0: bpy.ops.object.modifier_move_up(modifier=sub.name)
    bpy.ops.object.modifier_apply(modifier=sub.name)
    return o
def curve(name,pts,r,material,b=None,closed=False):
    d=bpy.data.curves.new(name,'CURVE'); d.dimensions='3D'; d.resolution_u=10; d.bevel_depth=r; d.bevel_resolution=2
    sp=d.splines.new('BEZIER'); sp.bezier_points.add(len(pts)-1)
    for p,co in zip(sp.bezier_points,pts): p.co=co; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    sp.use_cyclic_u=closed; o=bpy.data.objects.new(name,d); scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    return finish(o,name,material,b)
# Tailored torso: elliptical ring topology, tapered waist and sloping shoulders.
levels=[(1.10,.29,.225),(1.16,.34,.25),(1.35,.35,.245),(1.62,.385,.25),(1.88,.43,.245),(2.00,.40,.225),(2.07,.26,.19),(2.105,.145,.13)]
v=[]; f=[]
for i,(z,rx,ry) in enumerate(levels):
    for j in range(32): v.append((rx*cos(j*2*pi/32),ry*sin(j*2*pi/32),z))
    if i:
        for j in range(32): a=(i-1)*32+j; q=(i-1)*32+(j+1)%32; f.append((a,q,q+32,a+32))
f.extend([tuple(reversed(range(32))),tuple((len(levels)-1)*32+j for j in range(32))])
o=mesh('Tailored T-shirt',v,f,shirt,'torso'); sub=o.modifiers.new('Cloth contour','SUBSURF'); sub.levels=2
bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=sub.name)
uv('Neck',(0,0,2.14),(.14,.13,.22),skin,'neck')
curve('Collar',[(.15*cos(a),.137*sin(a),2.098) for a in [j*2*pi/24 for j in range(24)]],.014,M['Shirt seams'],'torso',True)
curve('Shirt hem',[(.335*cos(a),.248*sin(a),1.16) for a in [j*2*pi/32 for j in range(32)]],.008,M['Shirt seams'],'torso',True)
# Sculpted head surface with jaw/chin taper, cheek fullness and a broad forehead.
v=[]; f=[]
for i in range(25):
    a=pi*i/24; z=2.65+.52*cos(a); taper=.78+.22*min(1,max(0,(z-2.19)/.35))
    for j in range(40):
        t=2*pi*j/40; x=.425*sin(a)*cos(t)*taper; y=.335*sin(a)*sin(t)
        if y<0: y-=.025*math.exp(-((z-2.55)/.16)**2)
        v.append((x,y,z))
    if i:
        for j in range(40): k=(i-1)*40+j; q=(i-1)*40+(j+1)%40; f.append((k,q,q+40,k+40))
mesh('Face and tapered jaw',v,f,skin,'head')
for s in [-1,1]:
    uv('Ear',(s*.421,0,2.65),(.10,.075,.145),skin,'head')
    uv('Ear inset',(s*.464,-.051,2.65),(.048,.022,.09),M['Ear and lip warmth'],'head')
    uv('Eye',(s*.172,-.306,2.735),(.119,.065,.128),M['Eye whites'],'head')
    uv('Iris',(s*.164,-.367,2.736),(.056,.017,.068),M['Iris • hazel'],'head')
    uv('Pupil',(s*.16,-.381,2.738),(.029,.009,.045),M['Pupils'],'head')
    uv('Catchlight',(s*.16-.014,-.389,2.76),(.013,.005,.017),M['Eye whites'],'head',16,10)
    curve('Upper eyelid',[(s*.172-.112,-.326,2.765),(s*.172-.07,-.351,2.834),(s*.172+.03,-.354,2.854),(s*.172+.11,-.326,2.79)],.012,skin,'head')
    curve('Expressive brow',[(s*.172-.12,-.299,2.94),(s*.172-.045,-.326,2.98),(s*.172+.05,-.321,2.969),(s*.172+.115,-.28,2.94)],.026,hair,'head')
    # Soft-square glasses rings; no opaque lenses obscuring the eyes.
    cx=s*.177
    curve('Glasses rim',[(cx-.135,-.397,2.82),(cx-.125,-.407,2.66),(cx,-.416,2.626),(cx+.125,-.407,2.666),(cx+.136,-.396,2.815),(cx,-.4,2.864)],.013,M['Glasses • espresso'],'head',True)
    curve('Glasses temple',[(s*.315,-.396,2.80),(s*.405,-.21,2.82),(s*.447,.017,2.79)],.013,M['Glasses • espresso'],'head')
curve('Glasses bridge',[(-.042,-.414,2.771),(0,-.427,2.791),(.042,-.414,2.771)],.012,M['Glasses • espresso'],'head')
uv('Nose bridge',(0,-.33,2.63),(.064,.078,.125),skin,'head')
uv('Nose tip',(0,-.395,2.577),(.09,.097,.062),skin,'head')
curve('Smile',[(-.134,-.292,2.439),(-.085,-.337,2.409),(0,-.35,2.397),(.10,-.325,2.425),(.157,-.28,2.466)],.011,M['Ear and lip warmth'],'head')
curve('Lower lip',[(-.07,-.331,2.379),(0,-.344,2.368),(.075,-.318,2.397)],.013,skin,'head')
# Hair cap follows skull; front hairline is high enough to read eyebrows.
v=[]; f=[]
for i in range(15):
    for j in range(40):
        t=j*2*pi/40; front=max(0,-sin(t)); end=1.85-.79*front; a=.012+(end-.012)*i/14
        v.append((.446*sin(a)*cos(t),.351*sin(a)*sin(t)+.018,2.69+.52*cos(a)))
    if i:
        for j in range(40): k=(i-1)*40+j; q=(i-1)*40+(j+1)%40; f.append((k,q,q+40,k+40))
mesh('Swept hair cap',v,f,hair,'head')
for i in range(3):
    y=-.29+i*.115
    tube('Sculpted swept lock %d'%i,[(-.405,y-.025,2.99),(-.32,y-.015,3.11),(-.10,y+.01,3.225),(.16,y+.07,3.24),(.33,y+.12,3.13)],[(.006,.006),(.10,.065),(.16,.09),(.13,.085),(.02,.02)],hair,'head',20)
    curve('Hair strand %d'%i,[(-.37,y-.085,3.055),(-.26,y-.10,3.155),(-.05,y-.11,3.27),(.17,y-.04,3.29)],.003,M['Hair highlights'],'head')
# Legs, cuffs, stitched sneakers.
for side,s in [('R',-1),('L',1)]:
    h=Vector((s*.24,0,1.17)); k=Vector((s*.26,-.75,1.03)); a=Vector((s*.27,-.85,.25))
    pts=[h,h.lerp(k,.2),h.lerp(k,.65),k,k.lerp(a,.16),k.lerp(a,.72),a]
    ws=[{'thigh.'+side:1}]*3+[{'thigh.'+side:.5,'shin.'+side:.5}]+[{'shin.'+side:1}]*3
    tube('Seated trouser leg '+side,pts,[.20,.215,.185,.165,.145,.115,.105],red,sides=20,weights=ws)
    tube('Trouser cuff '+side,[a+Vector((0,0,.06)),a+Vector((0,0,.13))],[.116,.12],red,'shin.'+side,20)
    uv('Ankle '+side,a,(.085,.085,.13),skin,'foot.'+side)
    box('Sneaker sole '+side,(s*.27,-.98,.10),(.28,.49,.085),M['Sneaker sole and laces'],.065,'foot.'+side)
    uv('Sneaker upper '+side,(s*.27,-.94,.19),(.136,.225,.13),M['Sneakers • slate'],'foot.'+side)
    uv('Rubber toe '+side,(s*.27,-1.125,.15),(.134,.085,.071),M['Sneaker sole and laces'],'foot.'+side)
    for j in range(4):
        y=-1.045+j*.042
        curve('Lace '+side+str(j),[(s*.27-.074,y,.274),(s*.27,y-.018,.293),(s*.27+.074,y,.274)],.009,M['Sneaker sole and laces'],'foot.'+side)
# Continuous forearms with blended elbow rings; sleeve covers shoulder seam.
for side,s in [('R',-1),('L',1)]:
    sh,el,wr=rests[side]; up='upper_arm.'+side; fore='forearm.'+side
    pts=[sh,sh.lerp(el,.24),sh.lerp(el,.7),sh.lerp(el,.9),el,el.lerp(wr,.12),el.lerp(wr,.35),el.lerp(wr,.8),wr]
    ws=[{up:1},{up:1},{up:1},{up:.8,fore:.2},{up:.5,fore:.5},{up:.2,fore:.8},{fore:1},{fore:1},{fore:1}]
    tube('Deforming arm '+side,pts,[.125,.132,.113,.105,.10,.102,.099,.074,.066],skin,sides=20,weights=ws)
    uv('Shirt shoulder '+side,sh+Vector((-s*.035,0,.005)),(.175,.165,.18),shirt,up)
    tube('Short sleeve '+side,[sh+Vector((0,0,.08)),sh.lerp(el,.10),sh.lerp(el,.46),sh.lerp(el,.58)],[.15,.172,.157,.15],shirt,up,20)
    tube('Sleeve seam '+side,[sh.lerp(el,.56),sh.lerp(el,.585)],[.153,.153],M['Shirt seams'],up,20)
    uv('Palm '+side,wr+Vector((0,-.084,0)),(.098,.117,.047),skin,'hand.'+side)
    for label in ['index','middle','ring','pinky','thumb']:
        b1=arm.bones[label+'_1.'+side]; b2=arm.bones[label+'_2.'+side]
        p=b1.head_local; q=b2.head_local; t=b2.tail_local; r=.022 if label!='thumb' else .027
        pts=[p,p.lerp(q,.6),q,q.lerp(t,.4),q.lerp(t,.85),t]
        w=[{b1.name:1},{b1.name:1},{b1.name:.5,b2.name:.5},{b2.name:1},{b2.name:1},{b2.name:1}]
        tube(label+' finger '+side,pts,[r,r,r*.96,r*.92,r*.82,.006],skin,sides=10,weights=w)
# Stable lounge chair and laptop.
box('Chair cushion',(0,.04,.98),(1.10,.99,.23),M['Chair • blue upholstery'],.13)
back=box('Chair upholstered back',(0,.43,1.62),(1.1,.22,1.32),M['Chair • blue upholstery'],.13); back.rotation_euler.x=math.radians(-9)
for s in [-1,1]:
    box('Chair side bolster',(s*.56,.04,1.13),(.20,.94,.27),M['Chair • blue upholstery'],.095)
    curve('Chair seam',[(s*.55,-.35,1.19),(s*.59,.02,1.24),(s*.56,.40,1.25),(s*.53,.50,2.19)],.008,M['Chair piping'])
    for y in [-.30,.37]: tube('Tapered walnut leg',[(s*.48,y,.93),(s*.62,y+(.10 if y>0 else -.08),.06)],[.055,.038],M['Walnut legs'],sides=12)
box('Chair walnut base',(0,.05,.84),(1.08,.88,.10),M['Walnut legs'],.04)
box('Laptop base',(0,-.69,1.445),(.94,.65,.047),M['Laptop • satin aluminum'],.025)
box('Keyboard bed',(0,-.66,1.472),(.81,.30,.008),M['Keyboard'],.018)
for row in range(4):
    for col in range(11): box('Key %d %d'%(row,col),(-.355+col*.07,-.55-row*.064,1.48),(.054,.045,.007),M['Laptop • satin aluminum'],.004)
box('Trackpad',(0,-.89,1.474),(.28,.12,.005),M['Laptop • satin aluminum'],.01)
# Screen rises from front hinge and leans away, leaving hands behind it.
angle=math.radians(12); center=Vector((0,-1.014,1.765))
lid=box('Laptop lid',center,(.96,.043,.61),M['Laptop • satin aluminum'],.035); lid.rotation_euler.x=angle
screen=box('Laptop display',center+Vector((0,.026,0)),(.865,.008,.505),M['Screen'],.022); screen.rotation_euler.x=angle
for i,width in enumerate([.23,.39,.31,.19,.35]):
    o=box('Code line '+str(i),(-.15,center.y+.046-(.13-i*.055)*sin(angle),center.z+.13-i*.055),(width,.008,.012),M['Code • cyan'],.004); o.rotation_euler.x=angle
curve('Original code emblem',[(-.10,-1.043,1.81),(-.145,-1.043,1.765),(-.10,-1.043,1.72)],.009,M['Keyboard'])
curve('Original code emblem right',[(.10,-1.043,1.81),(.145,-1.043,1.765),(.10,-1.043,1.72)],.009,M['Keyboard'])
# Analytically posed limbs are baked to ordinary rotation keys: no runtime IK.
def reset():
    for p in rig.pose.bones: p.rotation_mode='QUATERNION'; p.location=(0,0,0); p.rotation_quaternion=(1,0,0,0); p.scale=(1,1,1)
def aim(n,head,tail,normal=None):
    b=rig.pose.bones[n]; direction=(Vector(tail)-Vector(head)).normalized()
    if normal is None:
        q=(b.bone.tail_local-b.bone.head_local).rotation_difference(direction) @ b.bone.matrix_local.to_quaternion()
    else:
        z=Vector(normal); x=direction.cross(z).normalized(); z=x.cross(direction).normalized(); q=Matrix((x,direction,z)).transposed().to_quaternion()
    b.matrix=Matrix.LocRotScale(Vector(head),q,Vector((1,1,1))); bpy.context.view_layer.update()
def solve_arm(side,target,amount):
    sh0,el0,wr0=rests[side]; sh=rig.pose.bones['upper_arm.'+side].head.copy()
    d=Vector(target)-sh; length=d.length; axis=d.normalized(); l1=(el0-sh0).length; l2=(wr0-el0).length
    along=(l1*l1-l2*l2+length*length)/(2*length); height=math.sqrt(max(0,l1*l1-along*along))
    pole=Vector(((-1 if side=='R' else 1)*1,-.16,-.6)); perp=(pole-axis*pole.dot(axis)).normalized(); el=sh+axis*along+perp*height
    aim('upper_arm.'+side,sh,el); aim('forearm.'+side,el,target)
    direction=Vector((.88,0,.475)) if side=='R' else Vector((0,-1,0))
    rest=Vector((0,-1,0)); q=rest.rotation_difference(direction); hand_dir=q.slerp(Quaternion(),1-amount) @ rest
    normal=Vector((0,-sin(amount*pi/2),cos(amount*pi/2)))
    aim('hand.'+side,target,Vector(target)+hand_dir*.14,normal)
rig.animation_data_create()
for clip,end in [('Idle',121),('Salute',79)]:
    action=bpy.data.actions.new(clip); action.use_fake_user=True; rig.animation_data.action=action
    for frame in range(1,end+1):
        reset(); t=(frame-1)/(end-1)
        if clip=='Salute':
            # Smooth lift, confident hold, smooth return; exactly matching endpoints.
            if t<.10: a=0
            elif t<.39: u=(t-.10)/.29; a=u*u*(3-2*u)
            elif t<.61: a=1
            elif t<.94: u=(t-.61)/.33; a=1-u*u*(3-2*u)
            else: a=0
        else: a=0
        breath=.009*sin(t*2*pi) if clip=='Idle' else .003*sin(t*2*pi)
        rig.pose.bones['torso'].rotation_quaternion=Quaternion((1,0,0),breath)
        rig.pose.bones['head'].rotation_quaternion=Quaternion((0,1,0),-.075*a) @ Quaternion((0,0,1),-.055*a)
        bpy.context.view_layer.update()
        for side in ['R','L']:
            target=rests[side][2].copy()
            if side=='R': target=target.lerp(Vector((-.62,-.42,2.765)),a)
            if clip=='Idle': target.z+=.004*sin(t*4*pi+(0 if side=='R' else pi))
            solve_arm(side,target,a if side=='R' else 0)
            for i,label in enumerate(['index','middle','ring','pinky','thumb']):
                curl=.09+.035*sin(t*8*pi+i) if clip=='Idle' else .09
                if side=='R': curl=curl*(1-a)+(0 if label in ['index','middle'] else 1.40)*a
                for segment in [1,2]: rig.pose.bones[label+'_'+str(segment)+'.'+side].rotation_quaternion=Quaternion((1,0,0),-curl)
        for p in rig.pose.bones:
            p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name)
    action.frame_start=1; action.frame_end=end
# Export only rig and geometry; neither lights nor camera are part of the web asset.
rig.animation_data.action=bpy.data.actions['Idle']; scene.frame_start=1; scene.frame_end=121; scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in {'MESH','ARMATURE'}: o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'developer-character.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_skins=True,export_morph=False,export_cameras=False,export_lights=False,export_yup=True)
# Studio review setup uses same view as React, with a transparent backdrop.
def track(o,target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4.3,-8,3.85)); cam=bpy.context.object; cam.name='Review camera'; track(cam,(0,-.23,1.64)); cam.data.type='ORTHO'; cam.data.ortho_scale=3.8; scene.camera=cam
for name,loc,power,size in [('Key',(-3,-4,6),500,4),('Fill',(4,-2,4),350,4),('Rim',(1,3,5),650,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.name=name; l.data.energy=power; l.data.shape='DISK'; l.data.size=size; track(l,(0,0,1.6))
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'scripts/blender/developer-character.blend'))
for name,clip,frame in [('idle','Idle',1),('hand-raising','Salute',22),('salute-hold','Salute',40),('hand-lowering','Salute',61),('final-seated','Salute',79)]:
    rig.animation_data.action=bpy.data.actions[clip]; scene.frame_set(frame); scene.render.filepath=str(REVIEW/(name+'.png')); bpy.ops.render.render(write_still=True)
    if name=='idle': bpy.data.images['Render Result'].save_render(str(OUT/'developer-character-fallback.png'),scene=scene)
rig.animation_data.action=bpy.data.actions['Idle']; scene.frame_set(1)
print('CHARACTER_GENERATION_COMPLETE')
